import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiBaseUrl, ApiError, createApiClient, type CurrentUser, type MeResponse, type Providers } from "@/lib/api-client";

/**
 * Server-side access to the Udhwa API for the admin panel. Every call is
 * made on behalf of the signed-in admin (bearer token from the session
 * cookie) and is never cached. The API enforces ADMIN on all /v1/admin routes.
 */
export const API_URL = apiBaseUrl(process.env.API_URL);
export const SESSION_COOKIE = "udhwa_session";
export const WEB_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function adminApi() {
  const jar = await cookies();
  return createApiClient({ baseUrl: API_URL, client: "admin", init: { cache: "no-store" }, token: () => jar.get(SESSION_COOKIE)?.value });
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  try {
    return (await (await adminApi()).get<MeResponse>("/v1/auth/me")).user;
  } catch (e) {
    // A stale or revoked session is "signed out"; an unreachable API is an error (shown by error.tsx).
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
});

/** Every admin page calls this (layouts alone aren't a security boundary). */
export async function requireAdmin(callbackUrl = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (user.role !== "ADMIN") redirect("/signin?error=NotAdmin");
  return user;
}

/** Configured integrations. `reachable: false` means the API couldn't be contacted. */
export const getProviders = cache(async (): Promise<Providers & { reachable: boolean }> => {
  try {
    return { ...(await (await adminApi()).get<Providers>("/v1/auth/providers")), reachable: true };
  } catch {
    return { google: false, uploads: false, uploadLimits: { maxBytes: 0, mimeTypes: [] }, reachable: false };
  }
});

/** Public URL of an entity on the website (admin "View live" links). */
export const liveUrl = (path: string) => `${WEB_URL}${path}`;
