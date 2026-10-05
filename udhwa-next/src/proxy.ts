import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl } from "@/lib/api-client";

/**
 * Legacy udhwa.in URLs (/news/news-4.html, /listings.html …) → new routes.
 * Only runs for *.html paths; slug-change redirects are handled inside the
 * detail pages (see lib/redirects.ts). Redirect data comes from the API.
 */
const API_URL = apiBaseUrl(process.env.API_URL);

export async function proxy(req: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/v1/redirects/resolve?path=${encodeURIComponent(req.nextUrl.pathname)}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    const { redirect } = (await res.json()) as { redirect: { toPath: string; permanent: boolean } | null };
    if (redirect) return NextResponse.redirect(new URL(redirect.toPath, req.url), redirect.permanent ? 308 : 307);
  } catch {
    // API unreachable: fall through to a normal 404.
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*.html"],
};
