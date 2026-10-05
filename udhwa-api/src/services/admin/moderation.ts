import { z } from "zod";
import { db, type CategoryKind, type CorrectionStatus, type Prisma } from "@/db";
import { sanitizeDoc, readingMinutes } from "@/lib/rich-text/schema";
import { slugify } from "@/lib/utils";
import { contributionSchemas, type ContributionTypeKey } from "@/lib/validation";
import { audit } from "../../lib/audit";
import type { CurrentUser } from "../../lib/auth";
import { badRequest, HttpError, notFound, parse } from "../../lib/http";
import { releaseContributionMedia } from "../community";
import { resolveRichImages, syncMediaUsage } from "../media";
import { uniqueSlug } from "./repo";

/**
 * Review workflow for community input. Approval converts a contribution
 * into a DRAFT entity that the team edits, verifies and publishes; the
 * contribution keeps a link to it so the contributor can follow along.
 */

const noteSchema = z.string().trim().max(2000).optional();

/** Plain text → paragraphs of rich text (contributors send plain text for most types). */
function plainToDoc(...parts: (string | undefined | null)[]) {
  const paras = parts
    .filter(Boolean)
    .join("\n\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return sanitizeDoc({ type: "doc", content: paras.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) }) as unknown as Prisma.InputJsonValue;
}

async function categoryId(kind: CategoryKind, slug?: string) {
  if (!slug) return null;
  return (await db.category.findUnique({ where: { kind_slug: { kind, slug } }, select: { id: true } }))?.id ?? null;
}

async function primaryLocalityId() {
  return (await db.locality.findFirst({ where: { isPrimary: true }, select: { id: true } }))?.id ?? null;
}

/** Ensures the contributor has an Author byline (for blogs/news). */
async function authorFor(userId: string) {
  const existing = await db.author.findUnique({ where: { userId } });
  if (existing) return existing.id;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const name = user.name ?? "Udhwa contributor";
  let slug = slugify(user.username ?? name, "contributor");
  if (await db.author.findUnique({ where: { slug } })) slug = `${slug}-${user.id.slice(-5)}`;
  const a = await db.author.create({ data: { name, slug, bio: user.bio, avatarUrl: user.image, userId } });
  return a.id;
}

/**
 * Approval = conversion into a DRAFT entity that the team edits and
 * publishes. The contribution keeps a link to it for status tracking.
 */
async function convert(c: { id: string; type: ContributionTypeKey; payload: unknown; userId: string; mediaIds: string[] }, adminId: string) {
  const parsed = contributionSchemas[c.type].safeParse(c.payload);
  if (!parsed.success) throw badRequest("Stored submission is no longer valid — edit it manually.");
  const p = parsed.data as Record<string, string | boolean | undefined>;
  const audits = { createdById: adminId, updatedById: adminId };
  const localityId = await primaryLocalityId();
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);

  switch (c.type) {
    case "PLACE": {
      const row = await db.place.create({
        data: {
          name: String(p.name), slug: await uniqueSlug("place", slugify(String(p.name), "place")), summary: String(p.summary),
          about: plainToDoc(s(p.details), p.sourceUrl ? `Source: ${p.sourceUrl}` : null), address: s(p.address),
          categoryId: await categoryId("PLACE", s(p.categorySlug) ?? undefined), localityId, status: "DRAFT", ...audits,
        },
      });
      return { field: "placeId", id: row.id, href: `/admin/place/${row.id}` };
    }
    case "BUSINESS": {
      const row = await db.business.create({
        data: {
          name: String(p.name), slug: await uniqueSlug("business", slugify(String(p.name), "business")), summary: String(p.summary),
          about: plainToDoc(s(p.details)), address: s(p.address), phone: s(p.phone), website: s(p.website), hoursNote: s(p.hours),
          categoryId: await categoryId("BUSINESS", s(p.categorySlug) ?? undefined), localityId, status: "DRAFT", ...audits,
        },
      });
      return { field: "businessId", id: row.id, href: `/admin/business/${row.id}` };
    }
    case "SERVICE": {
      const row = await db.service.create({
        data: {
          name: String(p.name), slug: await uniqueSlug("service", slugify(String(p.name), "service")), summary: String(p.summary),
          description: plainToDoc(s(p.details)), providerName: String(p.providerName), providerType: p.providerType === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL",
          serviceArea: s(p.serviceArea), phone: s(p.phone), availability: s(p.availability),
          categoryId: await categoryId("SERVICE", s(p.categorySlug) ?? undefined), localityId, status: "DRAFT", ...audits,
        },
      });
      return { field: "serviceId", id: row.id, href: `/admin/service/${row.id}` };
    }
    case "NEWS": {
      const row = await db.newsArticle.create({
        data: {
          title: String(p.title), slug: await uniqueSlug("news", slugify(String(p.title), "news")), excerpt: String(p.summary),
          content: plainToDoc(s(p.details), p.location ? `Location: ${p.location}` : null, p.happenedOn ? `Date: ${p.happenedOn}` : null),
          sourceName: s(p.sourceName) ?? "Community contribution", sourceUrl: s(p.sourceUrl), authorId: await authorFor(c.userId),
          localityId, status: "DRAFT", ...audits,
        },
      });
      return { field: "newsId", id: row.id, href: `/admin/news/${row.id}` };
    }
    case "BLOG": {
      const content = sanitizeDoc((c.payload as { content: unknown }).content);
      const { usage } = await resolveRichImages({ content }, { uploaderId: c.userId });
      const slug = await uniqueSlug("blog", slugify(String(p.title), "blog"));
      const authorId = await authorFor(c.userId);
      const row = await db.$transaction(async (tx) => {
        const created = await tx.blogPost.create({
          data: {
            title: String(p.title), slug, excerpt: String(p.excerpt),
            content: content as unknown as Prisma.InputJsonValue, readingMinutes: readingMinutes(content),
            language: String(p.language ?? "en"), authorId, status: "DRAFT", ...audits,
          },
        });
        await syncMediaUsage("blog", created.id, usage, tx);
        return created;
      });
      return { field: "blogId", id: row.id, href: `/admin/blog/${row.id}` };
    }
    case "PHOTO": {
      const mediaId = c.mediaIds[0];
      if (!mediaId || !(await db.media.findUnique({ where: { id: mediaId }, select: { id: true } }))) throw badRequest("The uploaded photo no longer exists.");
      const place = p.placeSlug ? await db.place.findUnique({ where: { slug: String(p.placeSlug) }, select: { id: true } }) : null;
      const user = await db.user.findUnique({ where: { id: c.userId }, select: { name: true } });
      const row = await db.photo.create({
        data: {
          mediaId, title: String(p.title), caption: s(p.caption), contributorId: c.userId, placeId: place?.id ?? null,
          takenAt: p.takenOn ? new Date(String(p.takenOn)) : null, credit: user?.name ?? null, status: "DRAFT",
        },
      });
      return { field: "photoId", id: row.id, href: `/admin/photo/${row.id}` };
    }
  }
}

export type ModerationAction = "start" | "request_changes" | "reject" | "approve";
const ACTIONS: ModerationAction[] = ["start", "request_changes", "reject", "approve"];

export async function moderateContribution(admin: CurrentUser, id: string, action: string, input: { note?: unknown }) {
  if (!ACTIONS.includes(action as ModerationAction)) throw new HttpError(400, "Invalid action");
  const note = parse(noteSchema, input.note || undefined);
  const c = await db.contribution.findUnique({ where: { id } });
  if (!c) throw notFound();
  if (["PUBLISHED", "WITHDRAWN", "REJECTED"].includes(c.status) || (c.status === "APPROVED" && action !== "reject")) {
    throw new HttpError(409, "This contribution has already been handled.");
  }
  if ((action === "request_changes" || action === "reject") && !note) {
    throw badRequest("Please add a note for the contributor.", { note: ["A short explanation helps the contributor"] });
  }

  const handled = () => new HttpError(409, "This contribution has already been handled.");
  let draft: { href: string; entity: string; id: string } | null = null;
  if (action === "approve") {
    // Claim it first (conditional on the status we read), so a concurrent
    // withdraw or a second approval can't race the conversion.
    const claimed = await db.contribution.updateMany({ where: { id, status: c.status }, data: { status: "APPROVED", reviewerId: admin.id, reviewedAt: new Date() } });
    if (!claimed.count) throw handled();
    let result: Awaited<ReturnType<typeof convert>>;
    try {
      result = await convert({ ...c, type: c.type as ContributionTypeKey }, admin.id);
    } catch (e) {
      await db.contribution.updateMany({ where: { id, status: "APPROVED" }, data: { status: c.status } });
      throw e;
    }
    await db.contribution.update({ where: { id }, data: { reviewNote: note ?? c.reviewNote, [result.field]: result.id } });
    const entity = result.href.split("/")[2];
    draft = { entity, id: result.id, href: `/${entity}/${result.id}` };
    // The new draft now holds its own references to the images.
    await releaseContributionMedia(id, c.userId, admin.id, "contribution approved");
  } else {
    const status = action === "start" ? "UNDER_REVIEW" : action === "request_changes" ? "CHANGES_REQUESTED" : "REJECTED";
    const res = await db.contribution.updateMany({ where: { id, status: c.status }, data: { status, reviewerId: admin.id, reviewedAt: new Date(), ...(note ? { reviewNote: note } : {}) } });
    if (!res.count) throw handled();
    if (status === "REJECTED") await releaseContributionMedia(id, c.userId, admin.id, "contribution rejected");
  }
  await audit({ actorId: admin.id, action: `contribution.${action}`, entityType: "Contribution", entityId: id, summary: `${action.replace("_", " ")}: ${c.title}` });
  return { ok: true, draft };
}

const CORRECTION_STATUSES: CorrectionStatus[] = ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"];

export async function updateCorrection(admin: CurrentUser, id: string, input: { status?: unknown; note?: unknown }) {
  const status = input.status as CorrectionStatus;
  if (!CORRECTION_STATUSES.includes(status)) throw new HttpError(400, "Invalid status");
  const note = parse(noteSchema, input.note || undefined);
  const c = await db.correction.findUnique({ where: { id } });
  if (!c) throw notFound();
  await db.correction.update({
    where: { id },
    data: {
      status,
      resolverId: admin.id,
      ...(note ? { resolutionNote: note } : {}),
      resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null,
    },
  });
  await audit({ actorId: admin.id, action: `correction.${status.toLowerCase()}`, entityType: "Correction", entityId: id, summary: `Correction marked ${status.toLowerCase()}` });
  return { ok: true };
}
