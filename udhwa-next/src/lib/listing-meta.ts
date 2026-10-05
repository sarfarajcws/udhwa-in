import { buildMetadata } from "@/lib/seo";
import { listHref } from "@/lib/utils";

/**
 * Listing metadata: canonical keeps category + page. Free-text searches and
 * tag views are crawlable but not indexed (they duplicate other listings).
 */
export function listingMetadata(o: { base: string; title: string; description: string; category?: { slug: string; name: string }; q?: string; tag?: string; page: number }) {
  const t = o.category ? `${o.category.name} — ${o.title}` : o.title;
  return buildMetadata({
    title: o.page > 1 ? `${t} (page ${o.page})` : t,
    description: o.description,
    path: listHref(o.base, { category: o.category?.slug, tag: o.tag, page: o.page }),
    noIndex: Boolean(o.q || o.tag),
  });
}
