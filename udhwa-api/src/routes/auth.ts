import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { allowedOrigins, cloudinaryEnabled, googleAudiences, googleEnabled, isProd } from "../env";
import {
  OAUTH_COOKIE, SESSION_COOKIE, createSession, deleteSession, exchangeGoogleCode, googleAuthUrl, pkcePair,
  readState, resolveSession, safeReturnTo, signState, upsertGoogleUser, verifyGoogleIdToken,
} from "../lib/auth";
import { hitLimit } from "../lib/rate-limit";
import { clientIp } from "../lib/context";
import { UPLOAD_LIMITS } from "../lib/cloudinary";
import type { AppEnv } from "../lib/context";
import { HttpError, parse } from "../lib/http";

/**
 * /v1/auth
 *
 * Browser flow (web & admin): the front-end proxies /api/v1/* to the API and
 * forwards x-forwarded-host/proto + x-udhwa-prefix, so cookies and Google's
 * redirect URI live on the front-end's own origin:
 *   https://<app>/api/v1/auth/google/callback   ← register these in Google Cloud
 *
 * Native apps: POST /v1/auth/google/token with a Google ID token → bearer token.
 */
export const authRoutes = new Hono<AppEnv>();

/** Public base URL for this request: the front-end origin (+ proxy prefix) or the API itself. */
function requestBase(c: Context<AppEnv>) {
  const host = c.req.header("x-forwarded-host");
  if (host) {
    const origin = `${c.req.header("x-forwarded-proto") ?? "http"}://${host}`;
    if (!allowedOrigins.has(origin)) throw new HttpError(400, `Origin ${origin} is not allowed. Add it to WEB_URL/ADMIN_URL/ALLOWED_ORIGINS.`);
    return { origin, base: `${origin}${c.req.header("x-udhwa-prefix") ?? ""}` };
  }
  const origin = new URL(c.req.url).origin;
  return { origin, base: origin };
}

const secureCookie = (c: Context<AppEnv>) => isProd || c.req.header("x-forwarded-proto") === "https";

function setSessionCookie(c: Context<AppEnv>, token: string, expires: Date) {
  setCookie(c, SESSION_COOKIE, token, { httpOnly: true, sameSite: "Lax", secure: secureCookie(c), path: "/", expires });
}

/** Which integrations this server has configured (Google is the only sign-in method). */
authRoutes.get("/providers", (c) =>
  c.json({ google: googleEnabled, uploads: cloudinaryEnabled, uploadLimits: { maxBytes: UPLOAD_LIMITS.maxBytes, mimeTypes: UPLOAD_LIMITS.mimeTypes } }),
);

authRoutes.get("/me", (c) => c.json({ user: c.get("user") }));

authRoutes.get("/google", (c) => {
  const { base, origin } = requestBase(c);
  const returnTo = safeReturnTo(c.req.query("returnTo"));
  if (!googleEnabled) return c.redirect(`${origin}/signin?error=GoogleNotConfigured`);
  if (hitLimit(`oauth:${clientIp(c.req.raw.headers)}`, 30, 10 * 60_000)) return c.redirect(`${origin}/signin?error=TooManyAttempts`);
  const { verifier, challenge, state, nonce } = pkcePair();
  setCookie(c, OAUTH_COOKIE, signState({ state, verifier, nonce, returnTo, base, exp: Date.now() + 10 * 60_000 }), {
    httpOnly: true, sameSite: "Lax", secure: secureCookie(c), path: "/", maxAge: 600,
  });
  return c.redirect(googleAuthUrl({ redirectUri: `${base}/v1/auth/google/callback`, state, challenge, nonce }));
});

authRoutes.get("/google/callback", async (c) => {
  const { origin } = requestBase(c);
  const stored = readState(getCookie(c, OAUTH_COOKIE));
  deleteCookie(c, OAUTH_COOKIE, { path: "/" });
  const fail = (code: string) => c.redirect(`${origin}/signin?error=${code}`);
  if (c.req.query("error")) return fail("AccessDenied");
  const code = c.req.query("code");
  if (!stored || !code || c.req.query("state") !== stored.state) return fail("OAuthState");
  // The callback must arrive on the same front-end that started the flow.
  if (stored.base !== origin && !stored.base.startsWith(`${origin}/`)) return fail("OAuthState");
  try {
    const idToken = await exchangeGoogleCode(code, stored.verifier, `${stored.base}/v1/auth/google/callback`);
    const user = await upsertGoogleUser(await verifyGoogleIdToken(idToken, { nonce: stored.nonce }));
    if (user.status === "SUSPENDED") return fail("Suspended");
    const { token, expires } = await createSession(user.id);
    setSessionCookie(c, token, expires);
    return c.redirect(`${origin}${stored.returnTo}`);
  } catch (e) {
    console.error("[auth] Google callback failed", e);
    return fail("OAuthCallback");
  }
});

/** Native apps: exchange a Google ID token (from the platform SDK) for an Udhwa session token. */
authRoutes.post("/google/token", async (c) => {
  if (!googleAudiences.length) throw new HttpError(503, "Google sign-in is not configured.", undefined, "not_configured");
  if (hitLimit(`idtoken:${clientIp(c.req.raw.headers)}`, 30, 10 * 60_000)) throw new HttpError(429, "Too many sign-in attempts. Please wait a few minutes.", undefined, "rate_limited");
  const { idToken } = parse(z.object({ idToken: z.string().min(10).max(4096) }), await c.req.json().catch(() => ({})));
  let profile;
  try {
    profile = await verifyGoogleIdToken(idToken);
  } catch {
    throw new HttpError(401, "Invalid Google ID token.", undefined, "invalid_token");
  }
  const user = await upsertGoogleUser(profile);
  if (user.status === "SUSPENDED") throw new HttpError(403, "This account is suspended.", undefined, "suspended");
  const { token, expires } = await createSession(user.id);
  return c.json({ token, expiresAt: expires, user: await resolveSession(token) });
});

authRoutes.post("/logout", async (c) => {
  const token = c.get("sessionToken");
  if (token) await deleteSession(token);
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: secureCookie(c), httpOnly: true, sameSite: "Lax" });
  return c.json({ ok: true });
});
