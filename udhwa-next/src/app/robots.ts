import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Crawlers may fetch every page. Private or thin pages (account, sign-in,
 * contribute, search, filtered listings) carry `noindex` instead of being
 * blocked here: a blocked URL can still be indexed from links because the
 * crawler never sees its noindex. Only the JSON API is off limits.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
