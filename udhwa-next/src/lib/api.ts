import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { apiBaseUrl, createApiClient, ApiError, type CurrentUser, type MeResponse, type Providers } from "@/lib/api-client";

/**
 * Server-side access to the Udhwa API.
 *
 * - `publicApi`: published content, cached in Next's data cache and tagged
 *   "content"; the API calls /api/revalidate when content changes.
 * - `userApi()`: requests on behalf of the signed-in visitor (bearer token
 *   from the session cookie), never cached.
 */
export const API_URL = apiBaseUrl(process.env.API_URL);
export const SESSION_COOKIE = "udhwa_session";
export const CONTENT_TAG = "content";

export const publicApi = createApiClient({
  baseUrl: API_URL,
  client: "web",
  init: { next: { revalidate: 300, tags: [CONTENT_TAG] } },
});

/** Uncached public calls (search, form options). */
export const freshApi = createApiClient({ baseUrl: API_URL, client: "web", init: { cache: "no-store" } });

export async function userApi() {
  const jar = await cookies();
  const h = await headers();
  return createApiClient({
    baseUrl: API_URL,
    client: "web",
    init: { cache: "no-store" },
    token: () => jar.get(SESSION_COOKIE)?.value,
    headers: () => {
      const fwd = h.get("x-forwarded-for");
      return fwd ? { "x-forwarded-for": fwd } : ({} as Record<string, string>);
    },
  });
}

/** The signed-in visitor, or null. Deduplicated per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return null;
  try {
    return (await (await userApi()).get<MeResponse>("/v1/auth/me")).user;
  } catch (e) {
    // A stale or revoked session is "signed out"; an unreachable API is an error (shown by error.tsx).
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return null;
    throw e;
  }
});

export async function requireUser(callbackUrl = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** Configured integrations. `reachable: false` means the API couldn't be contacted. */
export const getProviders = cache(async (): Promise<Providers & { reachable: boolean }> => {
  try {
    return { ...(await freshApi.get<Providers>("/v1/auth/providers")), reachable: true };
  } catch {
    return { google: false, uploads: false, uploadLimits: { maxBytes: 0, mimeTypes: [] }, reachable: false };
  }
});

export { ApiError };
