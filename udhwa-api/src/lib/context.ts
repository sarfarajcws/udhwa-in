import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { allowedOrigins } from "../env";
import { resolveSession, SESSION_COOKIE, type CurrentUser } from "./auth";
import { HttpError } from "./http";

export type AppEnv = {
  Variables: {
    user: CurrentUser | null;
    sessionToken: string | null;
    authVia: "cookie" | "bearer" | null;
  };
};

/** Resolves the caller from `Authorization: Bearer` or the session cookie. */
export const loadUser = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const cookie = bearer ? null : (getCookie(c, SESSION_COOKIE) ?? null);
  const token = bearer ?? cookie;
  c.set("sessionToken", token);
  c.set("authVia", bearer ? "bearer" : cookie ? "cookie" : null);
  c.set("user", token ? await resolveSession(token) : null);
  await next();
});

/**
 * CSRF defence for cookie-authenticated writes: require our custom header
 * (cross-site pages can't send it without a CORS preflight we don't grant)
 * and, when present, an allowed Origin. Bearer requests are exempt.
 */
export const csrf = createMiddleware<AppEnv>(async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && c.get("authVia") === "cookie") {
    const origin = c.req.header("origin");
    if (!c.req.header("x-udhwa-client") || (origin && !allowedOrigins.has(origin) && !isForwardedOrigin(c.req.raw.headers, origin))) {
      throw new HttpError(403, "Request blocked (CSRF check failed).", undefined, "csrf");
    }
  }
  await next();
});

function isForwardedOrigin(h: Headers, origin: string) {
  const host = h.get("x-forwarded-host");
  return Boolean(host) && origin === `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
}

export const requireUser = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("user")) throw new HttpError(401, "Please sign in to continue.", undefined, "unauthenticated");
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const u = c.get("user");
  if (!u) throw new HttpError(401, "Please sign in to continue.", undefined, "unauthenticated");
  if (u.role !== "ADMIN") throw new HttpError(403, "Admins only.", undefined, "forbidden");
  await next();
});

/** Always defined after requireUser/requireAdmin. */
export const userOf = (c: { get: (k: "user") => CurrentUser | null }) => c.get("user")!;

/** Best-effort client IP (our front-end proxies forward the original). */
export function clientIp(h: Headers) {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
