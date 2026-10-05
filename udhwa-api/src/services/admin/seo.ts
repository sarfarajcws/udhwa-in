import { db } from "@/db";
import { ENTITIES, publicPath, type EntityKey } from "@/lib/entities";

/**
 * Search-appearance health for published content: the same title and
 * description rules the public site applies (src/lib/seo.ts in udhwa-next),
 * checked across everything that is live.
 */
type Row = { id: string; slug?: string | null; title: string; description: string; seoTitle: string | null; seoDescription: string | null; coverId: string | null; noIndex: boolean; canonicalUrl: string | null };
export type SeoIssue = { entity: EntityKey; id: string; title: string; publicPath: string; problems: string[] };

const live = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });
const common = { id: true, slug: true, seoTitle: true, seoDescription: true, coverId: true, noIndex: true, canonicalUrl: true } as const;

async function rows(): Promise<[EntityKey, Row[]][]> {
  const [places, businesses, services, news, blogs] = await Promise.all([
    db.place.findMany({ where: live(), select: { ...common, name: true, summary: true } }),
    db.business.findMany({ where: live(), select: { ...common, name: true, summary: true } }),
    db.service.findMany({ where: live(), select: { ...common, name: true, summary: true } }),
    db.newsArticle.findMany({ where: live(), select: { ...common, title: true, excerpt: true } }),
    db.blogPost.findMany({ where: live(), select: { ...common, title: true, excerpt: true } }),
  ]);
  const named = (r: (typeof places)[number]) => ({ ...r, title: r.name, description: r.summary });
  const titled = (r: (typeof news)[number]) => ({ ...r, title: r.title, description: r.excerpt });
  return [["place", places.map(named)], ["business", businesses.map(named)], ["service", services.map(named)], ["news", news.map(titled)], ["blog", blogs.map(titled)]];
}

export async function seoReport() {
  const issues: SeoIssue[] = [];
  let checked = 0;
  for (const [entity, list] of await rows()) {
    const titles = new Map<string, number>();
    for (const r of list) {
      const t = (r.seoTitle?.trim() || r.title).toLowerCase();
      titles.set(t, (titles.get(t) ?? 0) + 1);
    }
    for (const r of list) {
      checked++;
      const title = r.seoTitle?.trim() || r.title;
      const desc = (r.seoDescription?.trim() || r.description).replace(/\s+/g, " ");
      const problems: string[] = [];
      if (title.length > 65) problems.push(`Title is ${title.length} characters (search results show about 60)`);
      if (desc.length < 50) problems.push(`Description is only ${desc.length} characters (aim for 120–160)`);
      if (desc.length > 170) problems.push(`Description is ${desc.length} characters and will be cut off`);
      if (!r.coverId) problems.push("No image — social shares and rich results will have no picture");
      if ((titles.get(title.toLowerCase()) ?? 0) > 1) problems.push(`Another ${ENTITIES[entity].label.toLowerCase()} has the same title`);
      if (r.noIndex) problems.push("Hidden from search engines (noindex)");
      if (r.canonicalUrl) problems.push(`Canonical points elsewhere (${r.canonicalUrl}) — this page won't be indexed`);
      if (problems.length) issues.push({ entity, id: r.id, title: r.title, publicPath: publicPath(entity, { id: r.id, slug: r.slug }), problems });
    }
  }
  const [photosNoAlt, photosNoCaption] = await Promise.all([
    db.photo.count({ where: { ...live(), media: { alt: "" } } }),
    db.photo.count({ where: { ...live(), OR: [{ caption: null }, { caption: "" }] } }),
  ]);
  return { checked, issues: issues.slice(0, 300), totalIssues: issues.length, photosNoAlt, photosNoCaption };
}
