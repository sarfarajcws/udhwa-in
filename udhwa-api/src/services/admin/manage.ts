import { z } from "zod";
import { db, type MessageStatus } from "@/db";
import { trimTrailingSlash } from "@/lib/redirect-path";
import { slugify } from "@/lib/utils";
import { audit } from "../../lib/audit";
import { deleteUserSessions, type CurrentUser } from "../../lib/auth";
import { badRequest, HttpError, notFound, parse } from "../../lib/http";
import { revalidateWeb } from "../../lib/revalidate";
import { deleteMediaIfUnused, describeUsage } from "../media";

/** Taxonomy, media library, users, messages and redirects. */

type Input = Record<string, unknown>;
const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const checkbox = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

// ── Categories ───────────────────────────────────────────────
const categorySchema = z.object({
  kind: z.enum(["PLACE", "BUSINESS", "SERVICE", "NEWS", "BLOG", "PHOTO"]),
  name: z.string().trim().min(2).max(60),
  slug: z.string().trim().max(60).optional(),
  description: optional(300),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function saveCategory(admin: CurrentUser, id: string | null, input: Input) {
  const parsed = parse(categorySchema, input);
  const data = { ...parsed, slug: slugify(parsed.slug || parsed.name, "category") };
  const clash = await db.category.findFirst({ where: { kind: data.kind, slug: data.slug, ...(id ? { id: { not: id } } : {}) } });
  if (clash) throw badRequest("A category with that slug already exists for this type.");
  const row = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
  await audit({ actorId: admin.id, action: id ? "category.update" : "category.create", entityType: "Category", entityId: row.id, summary: `${row.kind} category “${row.name}”` });
  revalidateWeb("category");
  return { ok: true, message: "Saved.", id: row.id };
}

export async function deleteCategory(admin: CurrentUser, id: string) {
  const row = await db.category.delete({ where: { id } }).catch(() => null);
  if (!row) throw notFound();
  await audit({ actorId: admin.id, action: "category.delete", entityType: "Category", entityId: id, summary: `Deleted category “${row.name}” (content kept, now uncategorised)` });
  revalidateWeb("category");
  return { ok: true };
}

export async function listCategories() {
  return db.category.findMany({
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { places: true, businesses: true, services: true, news: true, blogs: true, photos: true } } },
  });
}

// ── Tags ─────────────────────────────────────────────────────
export async function listTags() {
  return db.tag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { news: true, blogs: true, photos: true } } } });
}

export async function renameTag(_admin: CurrentUser, id: string, input: Input) {
  const name = parse(z.string().trim().min(1).max(40), input.name);
  await db.tag.update({ where: { id }, data: { name } });
  revalidateWeb("tag");
  return { ok: true };
}

export async function deleteTag(admin: CurrentUser, id: string) {
  const t = await db.tag.delete({ where: { id } }).catch(() => null);
  if (!t) throw notFound();
  await audit({ actorId: admin.id, action: "tag.delete", entityType: "Tag", entityId: id, summary: `Deleted tag “${t.name}”` });
  revalidateWeb("tag");
  return { ok: true };
}

// ── Authors ──────────────────────────────────────────────────
const authorSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  bio: optional(500),
  avatarUrl: optional(500).refine((v) => !v || /^(https:\/\/|\/seed\/)/.test(v), "Use an https:// URL"),
  userEmail: optional(200),
});

export async function listAuthors() {
  return db.author.findMany({ orderBy: { name: "asc" }, include: { user: { select: { email: true } }, _count: { select: { news: true, blogs: true } } } });
}

export async function saveAuthor(admin: CurrentUser, id: string | null, input: Input) {
  const { userEmail, ...rest } = parse(authorSchema, input);
  const slug = slugify(rest.slug || rest.name, "author");
  if (await db.author.findFirst({ where: { slug, ...(id ? { id: { not: id } } : {}) } })) throw badRequest("That slug is taken.");
  let userId: string | null = null;
  if (userEmail) {
    const u = await db.user.findUnique({ where: { email: userEmail.toLowerCase() } });
    if (!u) throw badRequest("No user with that email.");
    userId = u.id;
  }
  const data = { ...rest, slug, userId };
  const row = id ? await db.author.update({ where: { id }, data }) : await db.author.create({ data });
  await audit({ actorId: admin.id, action: id ? "author.update" : "author.create", entityType: "Author", entityId: row.id, summary: `Author “${row.name}”` });
  revalidateWeb("author");
  return { ok: true, message: "Saved.", id: row.id };
}

// ── Localities ───────────────────────────────────────────────
const localitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
  kind: z.enum(["VILLAGE", "TOWN", "CITY", "NEIGHBORHOOD", "BLOCK", "DISTRICT", "STATE", "REGION", "COUNTRY"]),
  parentId: optional(40),
  description: optional(600),
  isPrimary: checkbox.optional().default(false),
});

export async function listLocalities() {
  return db.locality.findMany({ orderBy: { name: "asc" } });
}

export async function saveLocality(admin: CurrentUser, id: string | null, input: Input) {
  const parsed = parse(localitySchema, input);
  const data = { ...parsed, slug: slugify(parsed.slug || parsed.name, "area") };
  if (id && data.parentId) {
    // Walk up from the new parent: reaching this locality would create a loop.
    let cursor: string | null = data.parentId;
    for (let depth = 0; cursor && depth < 20; depth++) {
      if (cursor === id) throw badRequest("A locality can’t sit inside itself.", { parentId: ["That would create a loop"] });
      cursor = (await db.locality.findUnique({ where: { id: cursor }, select: { parentId: true } }))?.parentId ?? null;
    }
  }
  const row = await db.$transaction(async (tx) => {
    if (data.isPrimary) await tx.locality.updateMany({ data: { isPrimary: false } });
    return id ? tx.locality.update({ where: { id }, data }) : tx.locality.create({ data });
  });
  await audit({ actorId: admin.id, action: id ? "locality.update" : "locality.create", entityType: "Locality", entityId: row.id, summary: `Locality “${row.name}”` });
  revalidateWeb("locality");
  return { ok: true, message: "Saved.", id: row.id };
}

// ── Media ────────────────────────────────────────────────────
const mediaCounts = { _count: { select: { placeCovers: true, businessCovers: true, serviceCovers: true, newsCovers: true, blogCovers: true, usages: true } } } as const;

/** Media that nothing references (no cover, photo, rich text or pending contribution). */
const unusedWhere = {
  photo: { is: null },
  placeCovers: { none: {} }, businessCovers: { none: {} }, serviceCovers: { none: {} }, newsCovers: { none: {} }, blogCovers: { none: {} },
  usages: { none: {} },
} as const;

export async function listMedia(q: { q?: string; missingAlt?: boolean; unused?: boolean; page: number }) {
  const where = {
    ...(q.missingAlt ? { alt: "" } : {}),
    ...(q.unused ? unusedWhere : {}),
    ...(q.q ? { OR: [{ alt: { contains: q.q, mode: "insensitive" as const } }, { caption: { contains: q.q, mode: "insensitive" as const } }] } : {}),
  };
  const [total, items] = await Promise.all([
    db.media.count({ where }),
    db.media.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * 24, take: 24,
      include: { uploadedBy: { select: { name: true } }, photo: { select: { id: true, status: true } }, ...mediaCounts },
    }),
  ]);
  return { total, items, pages: Math.max(1, Math.ceil(total / 24)) };
}

export async function mediaUsage(id: string) {
  if (!(await db.media.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
  return { uses: await describeUsage(id) };
}

const mediaSchema = z.object({ alt: z.string().trim().max(300), caption: optional(500), credit: optional(120) });

export async function updateMedia(_admin: CurrentUser, id: string, input: Input) {
  const data = parse(mediaSchema, input);
  const row = await db.media.update({ where: { id }, data }).catch(() => null);
  if (!row) throw notFound();
  revalidateWeb("media");
  return { ok: true, message: "Saved." };
}

export async function deleteMedia(admin: CurrentUser, id: string) {
  if (!(await db.media.findUnique({ where: { id }, select: { id: true } }))) throw notFound();
  const result = await deleteMediaIfUnused(id, admin.id, "deleted from the media library");
  if (!result.deleted) {
    const uses = await describeUsage(id);
    const list = uses.slice(0, 5).map((u) => `${u.kind}: ${u.label}`).join("; ");
    throw new HttpError(409, `This image is still used ${uses.length || result.uses} time${(uses.length || result.uses) === 1 ? "" : "s"} (${list}). Remove it from that content first.`, undefined, "in_use");
  }
  return { ok: true };
}

// ── Users ────────────────────────────────────────────────────
export async function listUsers(q: { q?: string; page: number }) {
  const where = q.q
    ? { OR: [{ name: { contains: q.q, mode: "insensitive" as const } }, { email: { contains: q.q, mode: "insensitive" as const } }, { username: { contains: q.q, mode: "insensitive" as const } }] }
    : {};
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * 30, take: 30, include: { _count: { select: { contributions: true, corrections: true } } } }),
  ]);
  return { total, users, pages: Math.max(1, Math.ceil(total / 30)) };
}

export async function setUserStatus(admin: CurrentUser, userId: string, status: unknown) {
  if (status !== "ACTIVE" && status !== "SUSPENDED") throw new HttpError(400, "Invalid status");
  if (userId === admin.id) throw new HttpError(409, "You can’t suspend yourself.");
  const u = await db.user.update({ where: { id: userId }, data: { status } });
  // Suspension signs the user out everywhere immediately.
  if (status === "SUSPENDED") await deleteUserSessions(userId);
  await audit({ actorId: admin.id, action: "user.status", entityType: "User", entityId: userId, summary: `${status === "SUSPENDED" ? "Suspended" : "Reactivated"} ${u.email}` });
  return { ok: true };
}

// ── Messages ─────────────────────────────────────────────────
export async function listMessages(status: MessageStatus) {
  return db.contactMessage.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function setMessageStatus(_admin: CurrentUser, id: string, status: unknown) {
  if (!["NEW", "READ", "ARCHIVED"].includes(status as string)) throw new HttpError(400, "Invalid status");
  await db.contactMessage.update({ where: { id }, data: { status: status as MessageStatus } });
  return { ok: true };
}

// ── Redirects ────────────────────────────────────────────────
const pathSchema = z.string().trim().min(1).max(300).regex(/^\/[^\s]*$/, "Paths start with /");

export async function listRedirects() {
  return db.redirect.findMany({ orderBy: { createdAt: "desc" } });
}

export async function saveRedirect(admin: CurrentUser, input: Input) {
  const data = parse(z.object({ fromPath: pathSchema, toPath: pathSchema, permanent: checkbox.optional().default(false) }), input);
  // A trailing slash would make the entry unreachable (lookups are trimmed the same way).
  data.fromPath = trimTrailingSlash(data.fromPath);
  data.toPath = trimTrailingSlash(data.toPath);
  if (data.fromPath === data.toPath) throw badRequest("From and to can’t be the same.");
  await db.redirect.upsert({ where: { fromPath: data.fromPath }, update: data, create: data });
  await audit({ actorId: admin.id, action: "redirect.save", entityType: "Redirect", summary: `${data.fromPath} → ${data.toPath}` });
  return { ok: true, message: "Saved." };
}

export async function deleteRedirect(_admin: CurrentUser, id: string) {
  await db.redirect.delete({ where: { id } }).catch(() => {
    throw notFound();
  });
  return { ok: true };
}

// ── Activity ─────────────────────────────────────────────────
export async function listActivity(page: number) {
  const [total, rows] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * 50, take: 50, include: { actor: { select: { name: true, email: true } } } }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / 50)) };
}
