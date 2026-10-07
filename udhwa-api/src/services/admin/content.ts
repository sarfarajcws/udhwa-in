import { db, type ContentStatus } from "@/db";
import { ENTITIES, ENTITY_KEYS, publicPath, type EntityKey } from "@/lib/entities";
import { daysAgo } from "@/lib/utils";
import { audit } from "../../lib/audit";
import type { CurrentUser } from "../../lib/auth";
import { badRequest, HttpError, notFound } from "../../lib/http";
import { loadLibrary, loadOptions, toFormValues } from "./options";
import type { RichDoc } from "@/lib/rich-text/schema";
import { clearMediaUsage, deleteMediaIfUnused, resolveRichImages, syncMediaUsage } from "../media";
import { parseEntityForm } from "./parse";
import { delegate, derived, LINK_FIELD, recordPathChange, revalidateEntity, statusPatch, tagsInput, uniqueSlug } from "./repo";

/**
 * Admin content management for all six content types, driven by the
 * entity registry (src/lib/entities.ts).
 */

const STATUSES: ContentStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];
const LIST_SIZE = 25;

/** When an entity goes live, any contribution that produced it is marked PUBLISHED. */
async function markContributionsPublished(key: EntityKey, id: string) {
  await db.contribution.updateMany({ where: { [LINK_FIELD[key]]: id, status: "APPROVED" }, data: { status: "PUBLISHED" } });
}

export function entityDef(key: string) {
  if (!(ENTITY_KEYS as string[]).includes(key)) throw notFound("Unknown content type");
  return ENTITIES[key as EntityKey];
}

// ── Reads ────────────────────────────────────────────────────
export async function listEntities(key: EntityKey, q: { q?: string; status?: string; missing?: string; stale?: boolean; page: number }) {
  const def = ENTITIES[key];
  const status = STATUSES.includes(q.status as ContentStatus) ? (q.status as ContentStatus) : undefined;
  const where: Record<string, unknown> = {
    ...(status ? { status } : { status: { not: "ARCHIVED" } }),
    ...(q.q ? { [def.titleField]: { contains: q.q, mode: "insensitive" } } : {}),
    ...(q.missing === "cover" ? { coverId: null, status: "PUBLISHED" } : {}),
    ...(q.missing === "phone" ? { phone: null, status: "PUBLISHED" } : {}),
    ...(q.missing === "verified" ? { verifiedAt: null, status: "PUBLISHED" } : {}),
    ...(q.missing === "source" ? { sourceName: null, sourceUrl: null, status: "PUBLISHED" } : {}),
    ...(q.stale ? { updatedAt: { lt: daysAgo(365) }, status: "PUBLISHED" } : {}),
  };
  const d = delegate(key);
  const total = await d.count({ where });
  const pages = Math.max(1, Math.ceil(total / LIST_SIZE));
  const page = Math.min(q.page, pages);
  const [rows, counts] = await Promise.all([
    d.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * LIST_SIZE,
      take: LIST_SIZE,
      include: key === "photo" ? { media: { select: { url: true, alt: true } }, place: { select: { name: true } }, service: { select: { name: true } }, category: { select: { name: true } } } : { category: { select: { name: true } } },
    }),
    Promise.all(STATUSES.map((s) => d.count({ where: { status: s } }))),
  ]);
  return { rows, total, page, pages, status: status ?? null, counts: Object.fromEntries(STATUSES.map((s, i) => [s, counts[i]])) as Record<ContentStatus, number> };
}

export async function newEntityMeta(key: EntityKey) {
  const def = ENTITIES[key];
  const [options, library, primary] = await Promise.all([loadOptions(def), loadLibrary(), db.locality.findFirst({ where: { isPrimary: true }, select: { id: true } })]);
  return { options, library, initial: { language: "en", providerType: "INDIVIDUAL", localityId: primary?.id ?? "" } as Record<string, unknown> };
}

export async function getEntity(key: EntityKey, id: string) {
  const def = ENTITIES[key];
  const hasTags = def.fields.some((f) => f.type === "tags");
  const include = {
    ...(hasTags ? { tags: { select: { name: true } } } : {}),
    ...(key === "blog" ? { relatedTo: { select: { id: true } } } : {}),
  };
  const row = await delegate(key).findUnique({ where: { id }, include: Object.keys(include).length ? include : undefined });
  if (!row) throw notFound();
  const link = { [LINK_FIELD[key]]: id };
  const [options, library, contributions, corrections, history] = await Promise.all([
    loadOptions(def),
    loadLibrary(),
    db.contribution.findMany({ where: link, include: { user: { select: { name: true, email: true } } } }),
    db.correction.findMany({ where: link, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } }),
    db.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "desc" }, take: 15, include: { actor: { select: { name: true } } } }),
  ]);
  // A post can't be related to itself.
  if (key === "blog" && options.blog) options.blog = options.blog.filter((o) => o.value !== id);
  return {
    row: {
      id, title: String(row[def.titleField]), slug: (row.slug as string | undefined) ?? null, status: row.status as ContentStatus,
      publishedAt: (row.publishedAt as Date | null) ?? null, updatedAt: row.updatedAt as Date, verified: Boolean(row.verifiedAt),
      publicPath: publicPath(key, { id, slug: row.slug as string | undefined }),
    },
    values: toFormValues(def, row),
    options, library, contributions, corrections, history,
  };
}

export async function previewEntity(key: EntityKey, id: string) {
  if (key === "photo") throw notFound();
  const row = await delegate(key).findUnique({ where: { id }, include: { cover: { select: { url: true, alt: true, caption: true, credit: true } } } });
  if (!row) throw notFound();
  return row;
}

// ── Writes ───────────────────────────────────────────────────
export async function saveEntity(admin: CurrentUser, key: EntityKey, id: string | null, input: Record<string, unknown>) {
  const def = ENTITIES[key];
  const parsed = parseEntityForm(def, input);
  if (!parsed.ok) throw badRequest("Please fix the highlighted fields.", parsed.fieldErrors);

  const intent = String(input.intent ?? "save");
  const d = delegate(key);
  const data = derived(key, parsed.data);
  const existing = id ? await d.findUnique({ where: { id } }) : null;
  if (id && !existing) throw notFound("This item no longer exists.");

  if (def.hasSlug) data.slug = await uniqueSlug(key, String(data.slug), id ?? undefined);
  if (def.hasVerify) {
    const verified = input.verified === "on" || input.verified === true;
    data.verifiedAt = verified ? ((existing?.verifiedAt as Date | null) ?? new Date()) : null;
  }
  if (key === "photo") {
    const clash = await db.photo.findFirst({ where: { mediaId: String(data.mediaId), ...(id ? { id: { not: id } } : {}) }, select: { id: true } });
    if (clash) throw badRequest("That image is already used by another photo.", { mediaId: ["Already used"] });
  }
  await assertRelations(def, data);

  // Images inside rich text must be library media; record where they're used.
  const richFields = def.fields.filter((f) => f.type === "rich").map((f) => f.name);
  const { usage } = await resolveRichImages(Object.fromEntries(richFields.map((n) => [n, data[n] as RichDoc | null])), { previous: existing ?? undefined });

  const tags = def.fields.some((f) => f.type === "tags") ? tagsInput(parsed.tags, existing ? "update" : "create") : undefined;
  // Related blogs: only existing posts, never itself.
  let relatedTo: { set?: { id: string }[]; connect?: { id: string }[] } | undefined;
  if (key === "blog") {
    const wanted = ((data.relatedBlogIds as string[] | undefined) ?? []).filter((r) => r !== id);
    const found = wanted.length ? await db.blogPost.findMany({ where: { id: { in: wanted } }, select: { id: true } }) : [];
    const ids = wanted.filter((w) => found.some((f) => f.id === w)).map((r) => ({ id: r }));
    relatedTo = existing ? { set: ids } : { connect: ids };
    delete data.relatedBlogIds;
  }
  const statusData =
    intent === "publish" ? statusPatch("PUBLISHED", { publishedAt: (data.publishedAt as Date | null) ?? (existing?.publishedAt as Date | null) }) : {};
  if (key === "photo") delete data.publishedAt;
  // Keep the original publish date unless the editor set one.
  if ("publishedAt" in data && data.publishedAt === null) delete data.publishedAt;

  // The content and its media references are written together: if an image is
  // deleted concurrently, the whole save fails instead of leaving a broken image.
  const row = await db.$transaction(async (tx) => {
    const t = (tx as unknown as Record<string, typeof d>)[def.model];
    const saved = existing
      ? await t.update({
          where: { id },
          data: { ...data, ...statusData, ...(tags ? { tags } : {}), ...(relatedTo ? { relatedTo } : {}), ...(key === "photo" ? {} : { updatedById: admin.id }) },
        })
      : await t.create({
          data: {
            ...data,
            status: "DRAFT",
            ...statusData,
            ...(tags ? { tags } : {}),
            ...(relatedTo ? { relatedTo } : {}),
            ...(key === "photo" ? { contributorId: admin.id } : { createdById: admin.id, updatedById: admin.id }),
          },
        });
    if (key !== "photo") await syncMediaUsage(key, String(saved.id), usage, tx);
    return saved;
  });
  if (existing && def.hasSlug && existing.slug !== row.slug) {
    await recordPathChange(`${def.publicBase}/${existing.slug}`, `${def.publicBase}/${row.slug}`);
  }

  if (row.status === "PUBLISHED") await markContributionsPublished(key, String(row.id));
  await audit({
    actorId: admin.id,
    action: existing ? (intent === "publish" ? "content.publish" : "content.update") : "content.create",
    entityType: def.label,
    entityId: String(row.id),
    summary: `${existing ? "Updated" : "Created"} ${def.label.toLowerCase()} “${String(row[def.titleField])}”${intent === "publish" ? " and published" : ""}`,
  });
  revalidateEntity(key, { id: String(row.id), slug: row.slug as string | undefined });
  const scheduled = row.status === "PUBLISHED" && row.publishedAt && (row.publishedAt as Date) > new Date();
  return {
    id: String(row.id),
    created: !existing,
    message: intent === "publish" ? (scheduled ? "Scheduled for publishing." : "Published.") : "Saved.",
  };
}

/** Selected categories must match the content type; related items must exist. */
async function assertRelations(def: (typeof ENTITIES)[EntityKey], data: Record<string, unknown>) {
  const errors: Record<string, string[]> = {};
  if (typeof data.categoryId === "string") {
    const kind = def.categoryKind ?? null;
    const cat = await db.category.findUnique({ where: { id: data.categoryId }, select: { kind: true } });
    if (!cat || cat.kind !== kind) errors.categoryId = ["Choose a category for this content type"];
  }
  if (typeof data.mediaId === "string" && !(await db.media.findUnique({ where: { id: data.mediaId }, select: { id: true } }))) errors.mediaId = ["That image no longer exists"];
  if (typeof data.coverId === "string" && !(await db.media.findUnique({ where: { id: data.coverId }, select: { id: true } }))) errors.coverId = ["That image no longer exists"];
  if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors);
}

const TRANSITIONS: Record<string, ContentStatus> = { publish: "PUBLISHED", unpublish: "DRAFT", review: "IN_REVIEW", archive: "ARCHIVED", restore: "DRAFT" };

export async function setEntityStatus(admin: CurrentUser, key: EntityKey, id: string, transition: string) {
  if (!(transition in TRANSITIONS)) throw new HttpError(400, "Invalid action");
  const d = delegate(key);
  const existing = await d.findUnique({ where: { id } });
  if (!existing) throw notFound();
  const status = TRANSITIONS[transition];
  const row = await d.update({ where: { id }, data: statusPatch(status, existing as { publishedAt?: Date | null }) });
  if (status === "PUBLISHED") await markContributionsPublished(key, id);
  const def = ENTITIES[key];
  await audit({ actorId: admin.id, action: `content.${transition}`, entityType: def.label, entityId: id, summary: `${transition[0].toUpperCase()}${transition.slice(1)}ed “${String(row[def.titleField])}”` });
  revalidateEntity(key, { id, slug: row.slug as string | undefined });
  return { ok: true, status };
}

export async function deleteEntity(admin: CurrentUser, key: EntityKey, id: string) {
  const def = ENTITIES[key];
  const d = delegate(key);
  const existing = await d.findUnique({ where: { id } });
  if (!existing) throw notFound();
  await db.$transaction(async (tx) => {
    await (tx as unknown as Record<string, { delete(a: unknown): Promise<unknown> }>)[def.model].delete({ where: { id } });
    if (key !== "photo") await clearMediaUsage(key, id, tx);
    // Old URLs of deleted content should 404, not redirect to a page that's gone.
    if (def.hasSlug) await tx.redirect.deleteMany({ where: { toPath: publicPath(key, { id, slug: existing.slug as string }) } });
  });
  // A photo owns its image: remove it (and the Cloudinary asset) unless something else still shows it.
  let mediaNote = "";
  if (key === "photo" && existing.mediaId) {
    const r = await deleteMediaIfUnused(String(existing.mediaId), admin.id, `photo “${String(existing.title)}” deleted`);
    mediaNote = r.deleted ? " and its image" : " (image kept: still used elsewhere)";
  }
  await audit({ actorId: admin.id, action: "content.delete", entityType: def.label, entityId: id, summary: `Deleted “${String(existing[def.titleField])}”${mediaNote}` });
  revalidateEntity(key, { id, slug: existing.slug as string | undefined });
  return { ok: true };
}
