import { z } from "zod";
import { db, type CategoryKind, type Prisma } from "@/db";
import {
  CORRECTION_TARGETS,
  contributionSchemas,
  contributionTitle,
  correctionSchema,
  profileSchema,
  type ContributionTypeKey,
  type CorrectionTargetKey,
} from "@/lib/validation";
import { audit } from "../lib/audit";
import type { CurrentUser } from "../lib/auth";
import { badRequest, HttpError, notFound, parse } from "../lib/http";
import { hitLimit } from "../lib/rate-limit";
import type { RichDoc } from "@/lib/rich-text/schema";
import { cleanupOwnedMedia, clearMediaUsage, resolveRichImages, syncMediaUsage, type UsageMap } from "./media";

/**
 * Everything a signed-in community member can do: contribute, correct,
 * track their submissions and manage their (deliberately simple) profile.
 * Nothing here can modify published content.
 */

const DAILY_LIMIT = 20;
type Input = Record<string, unknown>;

/** BLOG content may arrive as a JSON string (HTML forms) or an object (JSON clients). */
function withParsedContent(input: Input) {
  const out = { ...input };
  if (typeof out.content === "string") {
    try {
      out.content = JSON.parse(out.content);
    } catch {
      out.content = null;
    }
  }
  return out;
}

async function assertQuota(userId: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [c, k] = await Promise.all([
    db.contribution.count({ where: { userId, submittedAt: { gte: since } } }),
    db.correction.count({ where: { userId, createdAt: { gte: since } } }),
  ]);
  if (c + k >= DAILY_LIMIT || hitLimit(`contrib:${userId}`, 5, 60_000)) {
    throw new HttpError(429, "You’ve sent a lot today — thank you! Please try again tomorrow.", undefined, "rate_limited");
  }
}

// ── Contributions ────────────────────────────────────────────
/** Media referenced by a contribution: the photo upload and any images in blog text. */
async function contributionMedia(user: CurrentUser, type: ContributionTypeKey, payload: Record<string, unknown>, contributionId?: string): Promise<UsageMap> {
  const usage: UsageMap = {};
  if (type === "BLOG") {
    Object.assign(usage, (await resolveRichImages({ content: payload.content as RichDoc }, { uploaderId: user.id })).usage);
  }
  if (type === "PHOTO") {
    const mediaId = String(payload.mediaId);
    // Must be the submitter's own upload, not already a photo or part of another pending submission.
    const media = await db.media.findFirst({ where: { id: mediaId, uploadedById: user.id, photo: { is: null } }, select: { id: true } });
    const elsewhere = await db.mediaUsage.findFirst({ where: { mediaId, ownerType: "contribution", ...(contributionId ? { ownerId: { not: contributionId } } : {}) }, select: { id: true } });
    if (!media || elsewhere) throw badRequest("That upload couldn’t be used. Please upload the photo again.", { mediaId: ["Upload the photo again"] });
    usage.photo = [mediaId];
  }
  return usage;
}

export async function submitContribution(user: CurrentUser, type: ContributionTypeKey, input: Input) {
  const schema = contributionSchemas[type];
  if (!schema) throw badRequest("Unknown contribution type.");
  const payload = parse(schema, type === "BLOG" ? withParsedContent(input) : input) as Record<string, unknown>;
  const usage = await contributionMedia(user, type, payload);
  // Only well-formed submissions count against the quota.
  await assertQuota(user.id);
  const mediaIds = usage.photo ?? [];

  const row = await db.$transaction(async (tx) => {
    if (type === "PHOTO") {
      // Store alt text on the media itself so the reviewer sees it in context.
      await tx.media.update({ where: { id: mediaIds[0] }, data: { alt: String(payload.alt), caption: (payload.caption as string) ?? null } });
    }
    const created = await tx.contribution.create({
      data: { type, title: contributionTitle(type, payload), payload: payload as Prisma.InputJsonValue, mediaIds, userId: user.id },
    });
    await syncMediaUsage("contribution", created.id, usage, tx);
    return created;
  });
  await audit({ actorId: user.id, action: "contribution.submit", entityType: "Contribution", entityId: row.id, summary: `Submitted ${type.toLowerCase()}: ${row.title}` });
  return { id: row.id };
}

/** Edit & resubmit — only while it is still waiting or changes were requested. */
export async function resubmitContribution(user: CurrentUser, id: string, input: Input) {
  const existing = await db.contribution.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw notFound("Contribution not found.");
  if (!["SUBMITTED", "CHANGES_REQUESTED"].includes(existing.status)) throw new HttpError(409, "This contribution is already being reviewed and can’t be edited.");
  const type = existing.type as ContributionTypeKey;
  const raw = type === "BLOG" ? withParsedContent(input) : { ...input };
  if (type === "PHOTO") raw.mediaId = existing.mediaIds[0];
  const payload = parse(contributionSchemas[type], raw) as Record<string, unknown>;
  const usage = await contributionMedia(user, type, payload, existing.id);
  const before = await db.mediaUsage.findMany({ where: { ownerType: "contribution", ownerId: existing.id }, select: { mediaId: true } });
  await db.$transaction(async (tx) => {
    const res = await tx.contribution.updateMany({
      where: { id: existing.id, status: { in: ["SUBMITTED", "CHANGES_REQUESTED"] } },
      data: { payload: payload as Prisma.InputJsonValue, title: contributionTitle(type, payload), status: "SUBMITTED", submittedAt: new Date() },
    });
    if (!res.count) throw new HttpError(409, "This contribution is already being reviewed and can’t be edited.");
    if (type === "PHOTO") await tx.media.update({ where: { id: existing.mediaIds[0] }, data: { alt: String(payload.alt), caption: (payload.caption as string) ?? null } });
    await syncMediaUsage("contribution", existing.id, usage, tx);
  });
  // Images the contributor removed from their text are no longer needed.
  const kept = new Set(Object.values(usage).flat());
  await cleanupOwnedMedia(before.map((u) => u.mediaId).filter((m) => !kept.has(m)), user.id, user.id, "removed from a contribution");
  await audit({ actorId: user.id, action: "contribution.resubmit", entityType: "Contribution", entityId: existing.id, summary: `Resubmitted: ${existing.title}` });
  return { ok: true, message: "Updated and sent back for review." };
}

export async function withdrawContribution(user: CurrentUser, id: string) {
  const res = await db.contribution.updateMany({
    where: { id, userId: user.id, status: { in: ["SUBMITTED", "CHANGES_REQUESTED"] } },
    data: { status: "WITHDRAWN" },
  });
  if (!res.count) throw new HttpError(409, "This contribution can no longer be withdrawn.");
  await releaseContributionMedia(id, user.id, user.id, "contribution withdrawn");
  await audit({ actorId: user.id, action: "contribution.withdraw", entityType: "Contribution", entityId: id, summary: "Withdrawn by contributor" });
  return { ok: true };
}

/**
 * A contribution that is closed (withdrawn, rejected or converted) no longer
 * holds its images. Uploads nothing else uses are deleted (Cloudinary + row).
 */
export async function releaseContributionMedia(contributionId: string, contributorId: string, actorId: string, reason: string) {
  const held = await db.mediaUsage.findMany({ where: { ownerType: "contribution", ownerId: contributionId }, select: { mediaId: true } });
  await clearMediaUsage("contribution", contributionId);
  return cleanupOwnedMedia(held.map((h) => h.mediaId), contributorId, actorId, reason);
}

// ── Corrections ──────────────────────────────────────────────
const TARGET_FIELD = { place: "placeId", business: "businessId", service: "serviceId", news: "newsId", blog: "blogId", photo: "photoId" } as const;

/** A published entity that can receive a correction: its display name and public URL. */
export async function correctionTarget(target: CorrectionTargetKey, id: string) {
  const where = { id, status: "PUBLISHED" as const, publishedAt: { lte: new Date() } };
  switch (target) {
    case "place": { const r = await db.place.findFirst({ where, select: { name: true, slug: true } }); return r && { name: r.name, href: `/places/${r.slug}` }; }
    case "business": { const r = await db.business.findFirst({ where, select: { name: true, slug: true } }); return r && { name: r.name, href: `/businesses/${r.slug}` }; }
    case "service": { const r = await db.service.findFirst({ where, select: { name: true, slug: true } }); return r && { name: r.name, href: `/services/${r.slug}` }; }
    case "news": { const r = await db.newsArticle.findFirst({ where, select: { title: true, slug: true } }); return r && { name: r.title, href: `/news/${r.slug}` }; }
    case "blog": { const r = await db.blogPost.findFirst({ where, select: { title: true, slug: true } }); return r && { name: r.title, href: `/blogs/${r.slug}` }; }
    case "photo": { const r = await db.photo.findFirst({ where, select: { title: true, id: true } }); return r && { name: r.title, href: `/photos/${r.id}` }; }
  }
}

export function isCorrectionTarget(v: unknown): v is CorrectionTargetKey {
  return typeof v === "string" && (CORRECTION_TARGETS as readonly string[]).includes(v);
}

export async function submitCorrection(user: CurrentUser, input: Input) {
  const { target, id, ...rest } = parse(correctionSchema, input);
  if (!(await correctionTarget(target, id))) throw notFound("We couldn’t find that page any more.");
  await assertQuota(user.id);
  const row = await db.correction.create({ data: { ...rest, userId: user.id, [TARGET_FIELD[target]]: id } });
  await audit({ actorId: user.id, action: "correction.submit", entityType: "Correction", entityId: row.id, summary: `${rest.kind} on ${target}` });
  return { ok: true, id: row.id };
}

// ── Profile & account ────────────────────────────────────────
export async function updateProfile(user: CurrentUser, input: Input) {
  const { name, username, bio } = parse(profileSchema, input);
  if (username) {
    const taken = await db.user.findFirst({ where: { username, id: { not: user.id } }, select: { id: true } });
    if (taken) throw badRequest("Please choose another username.", { username: ["That username is taken"] });
  }
  await db.user.update({ where: { id: user.id }, data: { name, username: username ?? null, bio: bio ?? null } });
  return { ok: true, message: "Profile saved." };
}

export async function getAccount(user: CurrentUser) {
  const [contributions, corrections] = await Promise.all([
    db.contribution.findMany({ where: { userId: user.id }, orderBy: { submittedAt: "desc" }, select: { id: true, type: true, title: true, status: true, submittedAt: true } }),
    db.correction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, kind: true, status: true, message: true, createdAt: true, resolutionNote: true,
        place: { select: { name: true } }, business: { select: { name: true } }, service: { select: { name: true } },
        news: { select: { title: true } }, blog: { select: { title: true } }, photo: { select: { title: true } },
      },
    }),
  ]);
  return { user, contributions, corrections };
}

/** Options a contribution form needs (categories for the type, places for photos). */
export async function contributionFormOptions(type: ContributionTypeKey) {
  const catKind = (["PLACE", "BUSINESS", "SERVICE"] as const).includes(type as "PLACE") ? (type as CategoryKind) : null;
  const [categories, places] = await Promise.all([
    catKind ? db.category.findMany({ where: { kind: catKind }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }) : Promise.resolve([]),
    type === "PHOTO" ? db.place.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { slug: true, name: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  return { categories, places };
}

export async function getMyContribution(user: CurrentUser, id: string) {
  const c = await db.contribution.findFirst({
    where: { id, userId: user.id },
    include: {
      place: { select: { slug: true, status: true, publishedAt: true } }, business: { select: { slug: true, status: true, publishedAt: true } },
      service: { select: { slug: true, status: true, publishedAt: true } }, news: { select: { slug: true, status: true, publishedAt: true } },
      blog: { select: { slug: true, status: true, publishedAt: true } }, photo: { select: { id: true, status: true, publishedAt: true } },
    },
  });
  if (!c) throw notFound("Contribution not found.");
  const editable = c.status === "SUBMITTED" || c.status === "CHANGES_REQUESTED";
  const media = c.mediaIds.length ? await db.media.findMany({ where: { id: { in: c.mediaIds } }, select: { id: true, url: true, width: true, height: true, alt: true } }) : [];
  const options = editable ? await contributionFormOptions(c.type as ContributionTypeKey) : { categories: [], places: [] };
  const live = (r: { status: string; publishedAt: Date | null } | null) => Boolean(r && r.status === "PUBLISHED" && r.publishedAt && r.publishedAt <= new Date());
  const liveHref =
    c.status !== "PUBLISHED" ? null
    : live(c.place) ? `/places/${c.place!.slug}`
    : live(c.business) ? `/businesses/${c.business!.slug}`
    : live(c.service) ? `/services/${c.service!.slug}`
    : live(c.news) ? `/news/${c.news!.slug}`
    : live(c.blog) ? `/blogs/${c.blog!.slug}`
    : live(c.photo) ? `/photos/${c.photo!.id}` : null;
  return {
    contribution: { id: c.id, type: c.type, title: c.title, status: c.status, payload: c.payload as Record<string, unknown>, reviewNote: c.reviewNote, submittedAt: c.submittedAt },
    editable, media, liveHref, ...options,
  };
}

// ── Contact ──────────────────────────────────────────────────
const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email").max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Please write a little more").max(5000),
  website: z.string().max(0).optional(), // honeypot — must stay empty
});

export async function sendContactMessage(input: Input, ipHash: string, userId: string | null) {
  const r = contactSchema.safeParse(input);
  if (!r.success) {
    if (z.flattenError(r.error).fieldErrors.website) return { ok: true }; // silently drop bots
    throw badRequest("Please check the highlighted fields.", z.flattenError(r.error).fieldErrors as Record<string, string[]>);
  }
  const hourAgo = new Date(Date.now() - 3600_000);
  const [recent, everyone] = await Promise.all([
    db.contactMessage.count({ where: { ipHash, createdAt: { gte: hourAgo } } }),
    // A global ceiling too: IP-based limits alone can be dodged.
    db.contactMessage.count({ where: { createdAt: { gte: hourAgo } } }),
  ]);
  if (recent >= 5 || everyone >= 200 || hitLimit(`contact:${ipHash}`, 3, 60_000)) {
    throw new HttpError(429, "You’ve sent several messages recently. Please try again a little later.", undefined, "rate_limited");
  }
  const { website: _hp, phone, ...data } = r.data;
  void _hp;
  await db.contactMessage.create({ data: { ...data, phone: phone || null, ipHash, userId } });
  return { ok: true };
}
