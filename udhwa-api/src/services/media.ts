import { z } from "zod";
import { db } from "@/db";
import { docImages, type RichDoc } from "@/lib/rich-text/schema";
import { cloudinaryEnabled } from "../env";
import { audit } from "../lib/audit";
import type { CurrentUser } from "../lib/auth";
import { assetProblem, destroyAsset, fetchAsset, signUpload, uploadFolder } from "../lib/cloudinary";
import { badRequest, HttpError, parse } from "../lib/http";
import { hitLimit } from "../lib/rate-limit";
import type { UsageMap } from "./media-usage";

/**
 * Media: uploads, where each image is used, and safe deletion.
 *
 * A Media row can be referenced by
 *   - content covers (Place/Business/Service/News/Blog.coverId),
 *   - a Photo (1:1, the photo "owns" its media),
 *   - rich-text image nodes (tracked in MediaUsage, rebuilt on every save),
 *   - pending contributions (also MediaUsage, ownerType "contribution").
 * Deletion is refused while any reference exists; the database enforces the
 * same rule for photos and rich text (ON DELETE RESTRICT).
 */

const DAILY_UPLOADS = 40;

function assertEnabled() {
  if (!cloudinaryEnabled) throw new HttpError(503, "Image uploads are not configured on this server.", undefined, "uploads_disabled");
}

// ── Uploads ──────────────────────────────────────────────────
export function signForUser(user: CurrentUser) {
  assertEnabled();
  if (user.role !== "ADMIN" && hitLimit(`sign:${user.id}`, 30, 3600_000)) throw new HttpError(429, "Too many uploads. Please try again later.", undefined, "rate_limited");
  return signUpload(uploadFolder(user));
}

const registerSchema = z.object({
  publicId: z.string().min(1).max(300).regex(/^[\w\-/.]+$/, "Invalid upload id"),
  alt: z.string().trim().max(300).optional().default(""),
  caption: z.string().trim().max(500).optional(),
});

export async function registerUpload(user: CurrentUser, input: unknown) {
  assertEnabled();
  const { publicId, alt, caption } = parse(registerSchema, input);
  const folder = uploadFolder(user);

  const existing = await db.media.findUnique({ where: { publicId } });
  if (existing) {
    if (existing.uploadedById !== user.id) throw new HttpError(403, "Not allowed", undefined, "forbidden");
    return { id: existing.id, url: existing.url, width: existing.width, height: existing.height, alt: existing.alt };
  }

  // Durable per-user quota (holds across restarts and instances).
  if (user.role !== "ADMIN") {
    const today = await db.media.count({ where: { uploadedById: user.id, createdAt: { gte: new Date(Date.now() - 86400_000) } } });
    if (today >= DAILY_UPLOADS) throw new HttpError(429, "You’ve uploaded a lot of images today. Please try again tomorrow.", undefined, "rate_limited");
  }

  let asset;
  try {
    asset = await fetchAsset(publicId);
  } catch (e) {
    console.error("[media] Cloudinary lookup failed", e);
    throw new HttpError(503, "Couldn’t verify the upload with the image service. Please try again.", undefined, "upstream");
  }
  if (!asset) throw new HttpError(404, "Upload not found.", undefined, "not_found");
  const problem = assetProblem(asset, folder);
  if (problem) {
    // Never keep assets that fail verification — unless it's someone else's.
    if (problem !== "Upload is outside your folder.") await destroyAsset(publicId);
    throw new HttpError(problem === "Upload is outside your folder." ? 403 : 422, problem, undefined, "invalid_upload");
  }

  const media = await db.media.create({
    data: {
      provider: "CLOUDINARY", publicId, url: asset.secure_url, width: asset.width, height: asset.height,
      format: asset.format.toLowerCase(), bytes: asset.bytes, alt, caption: caption || null, uploadedById: user.id,
    },
  });
  await audit({ actorId: user.id, action: "media.upload", entityType: "Media", entityId: media.id, summary: `Uploaded ${publicId}` });
  return { id: media.id, url: media.url, width: media.width, height: media.height, alt: media.alt };
}

// ── Rich-text images ─────────────────────────────────────────
export { clearMediaUsage, syncMediaUsage, type OwnerType, type UsageMap } from "./media-usage";

/**
 * Validates and normalises the images inside rich-text fields:
 *  - an image with a mediaId must point at an existing Media row (and, for
 *    contributors, one they uploaded); its src/size are reset from the row,
 *    so a client can't pair an id with someone else's URL;
 *  - an uploaded image without a mediaId is matched by URL;
 *  - bundled /seed images are allowed (tracked when a Media row exists);
 *  - an unknown image that was already in the stored version of the field
 *    (legacy content saved before tracking existed) is kept, untracked, so
 *    old articles can still be edited;
 *  - anything else is rejected with a field error.
 * Returns normalised docs and the media ids used per field.
 */
export async function resolveRichImages(
  fields: Record<string, RichDoc | null | undefined>,
  opts: { uploaderId?: string; previous?: Record<string, unknown> } = {},
) {
  const nodes = Object.entries(fields).flatMap(([field, doc]) => (doc ? docImages(doc).map((node) => ({ field, node })) : []));
  const usage: UsageMap = Object.fromEntries(Object.keys(fields).map((f) => [f, [] as string[]]));
  if (!nodes.length) return { usage };

  const ids = [...new Set(nodes.map((n) => n.node.attrs?.mediaId).filter((v): v is string => typeof v === "string"))];
  const urls = [...new Set(nodes.filter((n) => !n.node.attrs?.mediaId).map((n) => String(n.node.attrs?.src ?? "")))];
  const rows = await db.media.findMany({
    where: { OR: [...(ids.length ? [{ id: { in: ids } }] : []), ...(urls.length ? [{ url: { in: urls } }] : [])] },
    select: { id: true, url: true, width: true, height: true, uploadedById: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const byUrl = new Map(rows.map((r) => [r.url, r]));

  const errors: Record<string, string[]> = {};
  const fail = (field: string, msg: string) => {
    errors[field] = [msg];
  };
  const previousSrcs = (field: string) => new Set(docImages(opts.previous?.[field] as RichDoc).map((n) => String(n.attrs?.src ?? "")));
  for (const { field, node } of nodes) {
    const a = node.attrs ?? {};
    const src = String(a.src ?? "");
    const row = typeof a.mediaId === "string" ? byId.get(a.mediaId) : byUrl.get(src);
    if (!row) {
      if (src.startsWith("/") || previousSrcs(field).has(src)) {
        node.attrs = { ...a, mediaId: null }; // bundled asset, or legacy content: kept as is, untracked
        continue;
      }
      fail(field, "An image in this field isn’t in the media library (it may have been deleted). Remove it and upload it again.");
      continue;
    }
    // Contributors may only embed their own uploads (bundled /seed images excepted).
    // Decided from the stored record, never from the client-supplied src.
    if (opts.uploaderId && row.uploadedById !== opts.uploaderId && !row.url.startsWith("/")) {
      fail(field, "You can only include images you uploaded yourself.");
      continue;
    }
    node.attrs = { ...a, mediaId: row.id, src: row.url, width: row.width ?? a.width ?? null, height: row.height ?? a.height ?? null };
    if (!usage[field].includes(row.id)) usage[field].push(row.id);
  }
  if (Object.keys(errors).length) throw badRequest("Please fix the images in the highlighted fields.", errors);
  return { usage };
}


// ── Usage & deletion ─────────────────────────────────────────
const usageInclude = {
  _count: { select: { placeCovers: true, businessCovers: true, serviceCovers: true, newsCovers: true, blogCovers: true, usages: true } },
  photo: { select: { id: true, title: true } },
} as const;

export function countUses(m: { _count: Record<string, number>; photo: unknown }) {
  return Object.values(m._count).reduce((a, b) => a + b, 0) + (m.photo ? 1 : 0);
}

/** Human-readable list of where a media item is used (shown when deletion is refused). */
export async function describeUsage(mediaId: string) {
  const [m, usages] = await Promise.all([
    db.media.findUnique({
      where: { id: mediaId },
      select: {
        photo: { select: { id: true, title: true } },
        placeCovers: { select: { id: true, name: true } },
        businessCovers: { select: { id: true, name: true } },
        serviceCovers: { select: { id: true, name: true } },
        newsCovers: { select: { id: true, title: true } },
        blogCovers: { select: { id: true, title: true } },
      },
    }),
    db.mediaUsage.findMany({ where: { mediaId }, select: { ownerType: true, ownerId: true, field: true } }),
  ]);
  if (!m) return [];
  const out: { kind: string; id: string; label: string; href: string | null }[] = [];
  if (m.photo) out.push({ kind: "Photo", id: m.photo.id, label: m.photo.title, href: `/photo/${m.photo.id}` });
  m.placeCovers.forEach((r) => out.push({ kind: "Place cover", id: r.id, label: r.name, href: `/place/${r.id}` }));
  m.businessCovers.forEach((r) => out.push({ kind: "Business cover", id: r.id, label: r.name, href: `/business/${r.id}` }));
  m.serviceCovers.forEach((r) => out.push({ kind: "Service image", id: r.id, label: r.name, href: `/service/${r.id}` }));
  m.newsCovers.forEach((r) => out.push({ kind: "News cover", id: r.id, label: r.title, href: `/news/${r.id}` }));
  m.blogCovers.forEach((r) => out.push({ kind: "Blog cover", id: r.id, label: r.title, href: `/blog/${r.id}` }));
  for (const u of usages) {
    out.push({
      kind: u.ownerType === "contribution" ? "Pending contribution" : `In ${u.ownerType} text (${u.field})`,
      id: u.ownerId,
      label: u.ownerType === "contribution" ? "Contribution" : u.ownerType,
      href: u.ownerType === "contribution" ? `/contributions/${u.ownerId}` : `/${u.ownerType}/${u.ownerId}`,
    });
  }
  return out;
}

/**
 * Deletes a media record and its Cloudinary asset — only when nothing uses it.
 * The row goes first (foreign keys guarantee no photo or rich text still
 * points at it), then the asset; if Cloudinary can't be reached the failure
 * is logged and audited for manual cleanup, and content is never broken.
 */
export async function deleteMediaIfUnused(mediaId: string, actorId: string | null, reason: string): Promise<{ deleted: boolean; uses: number }> {
  let m: Awaited<ReturnType<typeof db.media.findUnique<{ where: { id: string }; include: typeof usageInclude }>>>;
  try {
    m = await db.$transaction(async (tx) => {
      // Lock the row, then count uses: a concurrent save that adds a reference
      // either finishes first (and is counted) or waits and then fails its FK check.
      await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${mediaId} FOR UPDATE`;
      const row = await tx.media.findUnique({ where: { id: mediaId }, include: usageInclude });
      if (!row || countUses(row) > 0) return row;
      await tx.media.delete({ where: { id: mediaId } });
      return row;
    });
  } catch (e) {
    // P2003: something started referencing it in the meantime.
    if ((e as { code?: string }).code === "P2003") return { deleted: false, uses: 1 };
    throw e;
  }
  if (!m) return { deleted: false, uses: 0 };
  const uses = countUses(m);
  if (uses > 0) return { deleted: false, uses };
  let assetRemoved = true;
  if (m.provider === "CLOUDINARY" && m.publicId) assetRemoved = await destroyAsset(m.publicId);
  await audit({
    actorId,
    action: "media.delete",
    entityType: "Media",
    entityId: mediaId,
    summary: `Deleted image ${m.publicId ?? m.url} (${reason})${assetRemoved ? "" : " — Cloudinary asset NOT removed, delete it manually"}`,
    metadata: { publicId: m.publicId, assetRemoved },
  });
  return { deleted: true, uses: 0 };
}

/** Removes media that belonged only to the given (now gone) content. Never touches shared or in-use media. */
export async function cleanupOwnedMedia(mediaIds: string[], ownerUserId: string | null, actorId: string | null, reason: string) {
  let removed = 0;
  for (const id of new Set(mediaIds)) {
    const m = await db.media.findUnique({ where: { id }, select: { uploadedById: true } });
    if (!m) continue;
    if (ownerUserId && m.uploadedById !== ownerUserId) continue;
    if ((await deleteMediaIfUnused(id, actorId, reason)).deleted) removed++;
  }
  return removed;
}
