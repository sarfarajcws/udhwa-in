import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getSitemapData } from "@/lib/queries";

/** Every published, indexable entity, with its last modification time (data cached for an hour). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // render at request time; the API data itself is cached
  const { places, businesses, services, news, blogs, photos, authors, categories } = await getSitemapData();
  const LISTING: Record<string, string> = { PLACE: "/places", BUSINESS: "/businesses", SERVICE: "/services", NEWS: "/news", BLOG: "/blogs", PHOTO: "/photos" };
  const staticPages = ["/", "/places", "/businesses", "/services", "/news", "/blogs", "/photos", "/about", "/manifesto", "/contact", "/contribute"];
  return [
    ...staticPages.map((p) => ({ url: absoluteUrl(p), changeFrequency: (p === "/" || p === "/news" ? "daily" : "weekly") as "daily" | "weekly", priority: p === "/" ? 1 : 0.7 })),
    ...places.map((r) => ({ url: absoluteUrl(`/places/${r.slug}`), lastModified: r.updatedAt, priority: 0.8 })),
    ...businesses.map((r) => ({ url: absoluteUrl(`/businesses/${r.slug}`), lastModified: r.updatedAt, priority: 0.8 })),
    ...services.map((r) => ({ url: absoluteUrl(`/services/${r.slug}`), lastModified: r.updatedAt, priority: 0.7 })),
    ...news.map((r) => ({ url: absoluteUrl(`/news/${r.slug}`), lastModified: r.updatedAt, priority: 0.6 })),
    ...blogs.map((r) => ({ url: absoluteUrl(`/blogs/${r.slug}`), lastModified: r.updatedAt, priority: 0.7 })),
    ...photos.map((r) => ({ url: absoluteUrl(`/photos/${r.id}`), lastModified: r.updatedAt, priority: 0.4 })),
    ...authors.map((r) => ({ url: absoluteUrl(`/authors/${r.slug}`), lastModified: r.updatedAt, priority: 0.4 })),
    ...categories.map((c) => ({ url: absoluteUrl(`${LISTING[c.kind]}?category=${encodeURIComponent(c.slug)}`), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
