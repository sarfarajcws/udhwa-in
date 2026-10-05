import { db } from "@/db";
import { docImages, type RichDoc } from "@/lib/rich-text/schema";
import { syncMediaUsage, type OwnerType, type UsageMap } from "./media-usage";

/**
 * Rebuilds MediaUsage from the stored rich text (and pending contributions).
 * Non-destructive and idempotent: run after deploying the media-usage
 * migration (`npm run media:reindex`) or any time usage looks out of date.
 * Images are matched by their mediaId attribute, or by URL for older content.
 */
const SOURCES: { owner: OwnerType; fields: string[]; rows: () => Promise<Record<string, unknown>[]> }[] = [
  { owner: "place", fields: ["about", "history"], rows: () => db.place.findMany({ select: { id: true, about: true, history: true } }) },
  { owner: "business", fields: ["about"], rows: () => db.business.findMany({ select: { id: true, about: true } }) },
  { owner: "service", fields: ["description"], rows: () => db.service.findMany({ select: { id: true, description: true } }) },
  { owner: "news", fields: ["content"], rows: () => db.newsArticle.findMany({ select: { id: true, content: true } }) },
  { owner: "blog", fields: ["content"], rows: () => db.blogPost.findMany({ select: { id: true, content: true } }) },
];

export async function reindexMediaUsage() {
  const media = await db.media.findMany({ select: { id: true, url: true } });
  const ids = new Set(media.map((m) => m.id));
  const byUrl = new Map(media.map((m) => [m.url, m.id]));
  const resolve = (doc: unknown) =>
    docImages(doc as RichDoc)
      .map((n) => (typeof n.attrs?.mediaId === "string" && ids.has(n.attrs.mediaId) ? n.attrs.mediaId : byUrl.get(String(n.attrs?.src ?? ""))))
      .filter((v): v is string => Boolean(v));

  let owners = 0;
  let links = 0;
  for (const src of SOURCES) {
    for (const row of await src.rows()) {
      const usage: UsageMap = {};
      for (const f of src.fields) usage[f] = [...new Set(resolve(row[f]))];
      await syncMediaUsage(src.owner, String(row.id), usage);
      owners++;
      links += Object.values(usage).flat().length;
    }
  }

  // Contributions still waiting for review hold on to their uploads.
  const pending = await db.contribution.findMany({
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } },
    select: { id: true, type: true, payload: true, mediaIds: true },
  });
  for (const c of pending) {
    const usage: UsageMap = {
      photo: c.mediaIds.filter((m) => ids.has(m)),
      content: c.type === "BLOG" ? [...new Set(resolve((c.payload as { content?: unknown } | null)?.content))] : [],
    };
    await syncMediaUsage("contribution", c.id, usage);
    owners++;
    links += usage.photo.length + usage.content.length;
  }
  return { owners, links };
}
