import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "@/db";
import { safeCallback } from "@/lib/utils";
import { adminEmails, env, googleAudiences, sessionSecret } from "../env";

/**
 * Authentication for every client.
 *
 * - Sessions are opaque random tokens; only their SHA-256 hash is stored
 *   (Session table), so a database leak doesn't leak live sessions.
 * - Browsers (web/admin, via their same-origin /api proxy) carry the token
 *   in an httpOnly cookie. Server-to-server calls and mobile apps send it as
 *   `Authorization: Bearer <token>`.
 * - Google sign-in is the only way in: OAuth 2.0 code flow with PKCE (+
 *   state and nonce) for browsers, or an ID token exchange for native apps.
 * - Admin access is decided on the server from ADMIN_EMAILS alone. The
 *   stored role is re-synced on every request, so removing an email from
 *   ADMIN_EMAILS revokes admin access immediately.
 */

export const SESSION_COOKIE = "udhwa_session";
export const OAUTH_COOKIE = "udhwa_oauth";
const SESSION_DAYS = 30;
const SLIDE_AFTER_DAYS = 15;

export const userSelect = {
  id: true, name: true, email: true, image: true, username: true, bio: true, role: true, status: true, createdAt: true,
} as const;

export type CurrentUser = {
  id: string; name: string | null; email: string | null; image: string | null; username: string | null;
  bio: string | null; role: "USER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; createdAt: Date;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { sessionToken: hash(token), userId, expires } });
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
  // Opportunistic housekeeping: expired sessions are useless rows.
  if (Math.random() < 0.05) await db.session.deleteMany({ where: { expires: { lt: new Date() } } }).catch(() => {});
  return { token, expires };
}

/** The role an email is entitled to: ADMIN only when listed in ADMIN_EMAILS. */
export function roleForEmail(email: string | null | undefined): "USER" | "ADMIN" {
  return email && adminEmails.has(email.toLowerCase()) ? "ADMIN" : "USER";
}

/** Returns the active user for a session token (and slides the expiry), or null. */
export async function resolveSession(token: string): Promise<CurrentUser | null> {
  if (!token || token.length > 200) return null;
  const s = await db.session.findUnique({ where: { sessionToken: hash(token) }, include: { user: { select: userSelect } } });
  if (!s) return null;
  if (s.expires < new Date()) {
    await db.session.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  if (s.user.status !== "ACTIVE") return null;
  if (s.expires.getTime() - Date.now() < SLIDE_AFTER_DAYS * 86400_000) {
    await db.session.update({ where: { id: s.id }, data: { expires: new Date(Date.now() + SESSION_DAYS * 86400_000) } }).catch(() => {});
  }
  const role = roleForEmail(s.user.email);
  if (role !== s.user.role) {
    await db.user.update({ where: { id: s.user.id }, data: { role } }).catch(() => {});
    return { ...s.user, role };
  }
  return s.user;
}

export async function deleteSession(token: string) {
  await db.session.deleteMany({ where: { sessionToken: hash(token) } });
}

export async function deleteUserSessions(userId: string) {
  await db.session.deleteMany({ where: { userId } });
}

// ── Signed, short-lived OAuth state ──────────────────────────
type OAuthState = { state: string; verifier: string; nonce: string; returnTo: string; base: string; exp: number };

export function signState(s: OAuthState) {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  const sig = createHmac("sha256", sessionSecret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readState(value: string | undefined): OAuthState | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", sessionSecret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(16).toString("base64url"), nonce: randomBytes(16).toString("base64url") };
}

/** Only same-site relative paths (prevents open redirects). */
export const safeReturnTo = safeCallback;

// ── Google ───────────────────────────────────────────────────
/**
 * Google's endpoints. GOOGLE_TEST_BASE_URL points them at a local stand-in
 * for automated browser tests; it is ignored when NODE_ENV=production, so
 * production always talks to Google.
 */
const googleTestBase = env.NODE_ENV !== "production" ? process.env.GOOGLE_TEST_BASE_URL?.replace(/\/$/, "") : undefined;
export const GOOGLE_ENDPOINTS = googleTestBase
  ? { auth: `${googleTestBase}/auth`, token: `${googleTestBase}/token`, jwks: `${googleTestBase}/certs` }
  : { auth: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token", jwks: "https://www.googleapis.com/oauth2/v3/certs" };
const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_ENDPOINTS.jwks));

export function googleAuthUrl(o: { redirectUri: string; state: string; challenge: string; nonce: string }) {
  const u = new URL(GOOGLE_ENDPOINTS.auth);
  u.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: o.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: o.state,
    nonce: o.nonce,
    code_challenge: o.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u.toString();
}

export async function exchangeGoogleCode(code: string, verifier: string, redirectUri: string) {
  const res = await fetch(GOOGLE_ENDPOINTS.token, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, code_verifier: verifier, redirect_uri: redirectUri, grant_type: "authorization_code",
      client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET,
    }),
  });
  const json = (await res.json()) as { id_token?: string; error?: string };
  if (!res.ok || !json.id_token) throw new Error(`Google token exchange failed: ${json.error ?? res.status}`);
  return json.id_token;
}

export type GoogleProfile = { sub: string; email: string; name?: string; picture?: string };

type KeySource = Parameters<typeof jwtVerify>[1];

export async function verifyGoogleIdToken(idToken: string, opts: { nonce?: string; keys?: KeySource } = {}): Promise<GoogleProfile> {
  if (!googleAudiences.length) throw new Error("Google sign-in is not configured");
  const { payload } = await jwtVerify(idToken, opts.keys ?? GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: googleAudiences,
    clockTolerance: 30,
  });
  if (opts.nonce !== undefined && payload.nonce !== opts.nonce) throw new Error("Google ID token nonce mismatch");
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name as string | undefined, picture: payload.picture as string | undefined };
}

/**
 * Finds or creates the Udhwa user for a Google identity. Existing accounts
 * (including those created before this API existed) are matched by Google
 * account id, then by verified email.
 */
export async function upsertGoogleUser(p: GoogleProfile) {
  const account = await db.account.findUnique({ where: { provider_providerAccountId: { provider: "google", providerAccountId: p.sub } }, include: { user: true } });
  let user = account?.user ?? (await db.user.findUnique({ where: { email: p.email } }));
  const role = roleForEmail(p.email);
  if (!user) {
    user = await db.user.create({ data: { email: p.email, name: p.name ?? p.email.split("@")[0], image: p.picture, emailVerified: new Date(), role } });
  } else {
    const patch: { image?: string; role?: "USER" | "ADMIN"; emailVerified?: Date } = {};
    if (!user.image && p.picture) patch.image = p.picture;
    if (user.role !== roleForEmail(user.email)) patch.role = roleForEmail(user.email);
    if (!user.emailVerified) patch.emailVerified = new Date();
    if (Object.keys(patch).length) user = await db.user.update({ where: { id: user.id }, data: patch });
  }
  if (!account) {
    await db.account.create({ data: { userId: user.id, type: "oidc", provider: "google", providerAccountId: p.sub } });
  }
  return user;
}
