import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { db } from "@/db";
import { allowedOrigins, isProd } from "./env";
import { csrf, loadUser, type AppEnv } from "./lib/context";
import { HttpError } from "./lib/http";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { communityRoutes, meRoutes } from "./routes/community";
import { publicRoutes } from "./routes/public";

/**
 * Udhwa API — the single backend for the public website, the admin panel
 * and (later) mobile apps. JSON over HTTP, versioned under /v1.
 */
export const app = new Hono<AppEnv>();

/** Largest accepted request body (rich-text documents are the biggest payloads). */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

if (!isProd || process.env.LOG_REQUESTS === "true") {
  app.use(logger());
} else {
  // Production: one line per failed or slow request (successful traffic stays quiet).
  app.use(async (c, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    if (c.res.status >= 500 || ms > 2000) console.log(`[api] ${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
  });
}

app.use(
  secureHeaders({
    crossOriginResourcePolicy: "same-site",
    // JSON only: nothing here should ever be rendered or framed.
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    strictTransportSecurity: isProd ? "max-age=63072000; includeSubDomains" : false,
  }),
);

// Browsers normally reach the API through the front-ends' same-origin proxy;
// CORS is only for allowed origins calling it directly.
app.use(
  "/v1/*",
  cors({
    origin: (o) => (allowedOrigins.has(o) ? o : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["content-type", "authorization", "x-udhwa-client"],
    maxAge: 600,
  }),
);
app.use(
  "/v1/*",
  bodyLimit({
    maxSize: MAX_BODY_BYTES,
    onError: (c) => c.json({ error: "That request is too large.", code: "too_large" }, 413),
  }),
);
app.use("/v1/*", loadUser, csrf);

// Personal and admin responses must never be cached by browsers or proxies.
app.use("/v1/*", async (c, next) => {
  await next();
  const p = c.req.path;
  if (p.startsWith("/v1/auth") || p.startsWith("/v1/me") || p.startsWith("/v1/admin") || c.req.method !== "GET") {
    c.header("Cache-Control", "private, no-store");
  }
});

app.get("/health", async (c) => {
  try {
    await db.$queryRaw`SELECT 1`;
    return c.json({ ok: true, service: "udhwa-api", time: new Date().toISOString() });
  } catch {
    return c.json({ ok: false, service: "udhwa-api", error: "database unavailable" }, 503);
  }
});

app.route("/v1/auth", authRoutes);
app.route("/v1/me", meRoutes);
app.route("/v1/admin", adminRoutes);
app.route("/v1", communityRoutes);
app.route("/v1", publicRoutes);

app.notFound((c) => c.json({ error: "Not found", code: "not_found" }, 404));

/** Maps known database failures to meaningful HTTP errors. */
export function databaseError(err: unknown): HttpError | null {
  const code = (err as { code?: unknown })?.code;
  const name = (err as { name?: unknown })?.name;
  if (typeof code === "string") {
    if (code === "P2025") return new HttpError(404, "That item no longer exists.", undefined, "not_found");
    if (code === "P2002") return new HttpError(409, "That conflicts with an existing item (it must be unique).", undefined, "conflict");
    if (code === "P2003") return new HttpError(409, "A related item is missing or still in use.", undefined, "conflict");
    if (code === "P2000") return new HttpError(422, "One of the values is too long.", undefined, "invalid");
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code)) return new HttpError(503, "The database is temporarily unavailable. Please try again.", undefined, "unavailable");
  }
  if (name === "PrismaClientInitializationError") return new HttpError(503, "The database is temporarily unavailable. Please try again.", undefined, "unavailable");
  return null;
}

app.onError((err, c) => {
  const known = err instanceof HttpError ? err : databaseError(err);
  if (known) {
    if (known.status >= 500) console.error(`[api] ${c.req.method} ${c.req.path}`, err);
    return c.json({ error: known.message, code: known.code, fieldErrors: known.fieldErrors }, known.status);
  }
  console.error(`[api] ${c.req.method} ${c.req.path}`, err);
  return c.json({ error: "Something went wrong. Please try again.", code: "internal" }, 500);
});

export type App = typeof app;
