import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl } from "@/lib/api-client";

/**
 * Legacy udhwa.in URLs (/news/news-4.html, /listings.html …) → new routes.
 * Only runs for *.html paths; slug-change redirects are handled inside the
 * detail pages (see lib/redirects.ts). Redirect data comes from the API, which
 * matches the path leniently (encoding, trailing slash, letter case).
 */
const API_URL = apiBaseUrl(process.env.API_URL);
const ATTEMPTS = 2;
const TIMEOUT_MS = 8000; // a cold database/API can take several seconds; a 404 here would be cached by crawlers

type Resolved = { redirect: { toPath: string; permanent: boolean } | null };

async function resolve(path: string): Promise<Resolved["redirect"]> {
  let lastError: unknown;
  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const res = await fetch(`${API_URL}/v1/redirects/resolve?path=${encodeURIComponent(path)}`, {
        cache: "no-store",
        headers: { accept: "application/json", "x-udhwa-client": "web" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      return ((await res.json()) as Resolved).redirect;
    } catch (e) {
      lastError = e;
    }
  }
  // Fall through to a normal 404, but leave a trace: a silent failure looks exactly like "no redirect".
  console.error(`[proxy] redirect lookup failed for ${path}:`, lastError);
  return null;
}

export async function proxy(req: NextRequest) {
  const redirect = await resolve(req.nextUrl.pathname);
  // Query strings (utm_*, fbclid …) are dropped on purpose: the destination is a canonical page.
  if (redirect) return NextResponse.redirect(new URL(redirect.toPath, req.url), redirect.permanent ? 308 : 307);
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*.html"],
};
