import { db, type ContentStatus } from "@/db";
import { readingMinutes } from "@/lib/rich-text/schema";
import { ENTITIES, type EntityKey } from "@/lib/entities";
import { revalidateWeb } from "../../lib/revalidate";

/**
 * Thin generic data access over the six content models. The registry
 * guarantees field names; Prisma still enforces types and constraints.
 */
type AnyDelegate = {
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  findFirst(args: unknown): Promise<Record<string, unknown> | null>;
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  count(args?: unknown): Promise<number>;
  create(args: unknown): Promise<Record<string, unknown>>;
  update(args: unknown): Promise<Record<string, unknown>>;
  delete(args: unknown): Promise<Record<string, unknown>>;
};

export function delegate(key: EntityKey): AnyDelegate {
  return (db as unknown as Record<string, AnyDelegate>)[ENTITIES[key].model];
}

/** FK name used by Contribution/Correction for each entity. */
export const LINK_FIELD: Record<EntityKey, string> = {
  place: "placeId", business: "businessId", service: "serviceId", news: "newsId", blog: "blogId", photo: "photoId",
};

export async function uniqueSlug(key: EntityKey, base: string, excludeId?: string) {
  const d = delegate(key);
  let slug = base;
  for (let i = 2; i < 200; i++) {
    const hit = await d.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Keeps redirects chain-free when a public path changes. */
export async function recordPathChange(from: string, to: string) {
  if (from === to) return;
  await db.$transaction([
    db.redirect.deleteMany({ where: { fromPath: to } }),
    db.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } }),
    db.redirect.upsert({ where: { fromPath: from }, update: { toPath: to, permanent: true }, create: { fromPath: from, toPath: to } }),
  ]);
}

export function tagsInput(tags: string[] | null, mode: "create" | "update") {
  if (tags === null) return undefined;
  const ops = tags.map((name) => {
    const slug = name.toLowerCase().replace(/\+/g, "plus").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "tag";
    return { where: { slug }, create: { slug, name } };
  });
  return mode === "create" ? { connectOrCreate: ops } : { set: [], connectOrCreate: ops };
}

export function derived(key: EntityKey, data: Record<string, unknown>) {
  if (key === "blog" && data.content) return { ...data, readingMinutes: readingMinutes(data.content) };
  return data;
}

/** Refresh the public website after an entity changes. */
export function revalidateEntity(key: EntityKey, row: { slug?: string | null; id: string }) {
  revalidateWeb(`${ENTITIES[key].label} ${row.slug ?? row.id}`);
}

export function statusPatch(status: ContentStatus, current: { publishedAt?: Date | null }) {
  if (status === "PUBLISHED") return { status, publishedAt: current.publishedAt ?? new Date() };
  return { status };
}
