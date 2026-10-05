import { z } from "zod";

/**
 * API environment, validated once at startup. In production every
 * integration (Google OAuth, Cloudinary, sessions, revalidation, admin
 * accounts) is required and the process refuses to start without it.
 * Outside production, Google/Cloudinary may be missing: the features that
 * need them report themselves as unavailable.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Public origins of the two front-ends (OAuth redirect URIs, CORS, site URLs). */
  WEB_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_URL: z.string().url().default("http://localhost:3001"),
  /** Extra allowed origins, comma separated (e.g. a staging site). */
  ALLOWED_ORIGINS: z.string().optional().default(""),
  /** Where the API reaches the web app server-side (cache revalidation webhook). Defaults to WEB_URL. */
  WEB_INTERNAL_URL: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional().default(""),

  /** Signs short-lived OAuth state cookies and salts hashed IPs. */
  SESSION_SECRET: z.string().min(16).optional(),
  /** Neon/Postgres pool size per API instance. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  /** Extra OAuth client IDs whose ID tokens are accepted (future iOS/Android apps). */
  GOOGLE_MOBILE_CLIENT_IDS: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  CLOUDINARY_FOLDER: z.string().regex(/^[\w-]+(\/[\w-]+)*$/, "letters, numbers, dashes and slashes only").optional().default("udhwa"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment:", z.flattenError(parsed.error).fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/** Production refuses to start with missing or unsafe configuration. */
export function productionProblems(e: typeof env): string[] {
  const p: string[] = [];
  if (!e.SESSION_SECRET || e.SESSION_SECRET.length < 32) p.push("SESSION_SECRET must be at least 32 characters");
  if (!e.REVALIDATE_SECRET || e.REVALIDATE_SECRET.length < 24) p.push("REVALIDATE_SECRET must be at least 24 characters");
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) p.push("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  if (!e.ADMIN_EMAILS.trim()) p.push("ADMIN_EMAILS must list at least one admin account");
  if (!e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) p.push("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required");
  for (const [k, v] of [["WEB_URL", e.WEB_URL], ["ADMIN_URL", e.ADMIN_URL]] as const) if (!v.startsWith("https://")) p.push(`${k} must be an https:// URL`);
  return p;
}
if (isProd) {
  const problems = productionProblems(env);
  if (problems.length) {
    console.error("Invalid production configuration:\n - " + problems.join("\n - "));
    throw new Error("Invalid production configuration");
  }
}
export const sessionSecret = env.SESSION_SECRET ?? "dev-only-session-secret-change-me";

const trim = (u: string) => u.replace(/\/$/, "");
export const webUrl = trim(env.WEB_URL);
export const adminUrl = trim(env.ADMIN_URL);
/** Accepts a full URL or a bare host:port (Render private network). */
export const webInternalUrl = trim(env.WEB_INTERNAL_URL ? (/^https?:\/\//.test(env.WEB_INTERNAL_URL) ? env.WEB_INTERNAL_URL : `http://${env.WEB_INTERNAL_URL}`) : env.WEB_URL);
export const allowedOrigins = new Set([webUrl, adminUrl, ...env.ALLOWED_ORIGINS.split(",").map((s) => trim(s.trim())).filter(Boolean)]);

export const adminEmails = new Set(env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const googleAudiences = [env.GOOGLE_CLIENT_ID, ...env.GOOGLE_MOBILE_CLIENT_IDS.split(",").map((s) => s.trim())].filter(Boolean);
export const cloudinaryEnabled = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
