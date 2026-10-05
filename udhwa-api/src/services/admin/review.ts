import { db, type ContributionStatus, type ContributionType } from "@/db";
import { ENTITIES, ENTITY_KEYS } from "@/lib/entities";
import { daysAgo } from "@/lib/utils";
import { notFound } from "../../lib/http";
import { delegate } from "./repo";

/** Read models for the admin dashboard and review queues. */

export async function adminCounts() {
  const [contributions, corrections, messages] = await Promise.all([
    db.contribution.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.correction.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);
  return { contributions, corrections, messages };
}

export async function dashboard() {
  const yearAgo = daysAgo(365);
  const [pending, recentContributions, openCorrections, newMessages, activity, contentCounts, health] = await Promise.all([
    db.contribution.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.contribution.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED"] } },
      orderBy: { submittedAt: "asc" },
      take: 6,
      include: { user: { select: { name: true } } },
    }),
    db.correction.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.contactMessage.count({ where: { status: "NEW" } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } }),
    Promise.all(
      ENTITY_KEYS.map(async (k) => {
        const d = delegate(k);
        const [published, drafts, review] = await Promise.all([
          d.count({ where: { status: "PUBLISHED" } }),
          d.count({ where: { status: "DRAFT" } }),
          d.count({ where: { status: "IN_REVIEW" } }),
        ]);
        return { key: k, label: ENTITIES[k].plural, published, drafts, review };
      }),
    ),
    Promise.all([
      db.place.count({ where: { status: "PUBLISHED", coverId: null } }),
      db.business.count({ where: { status: "PUBLISHED", coverId: null } }),
      db.business.count({ where: { status: "PUBLISHED", phone: null } }),
      db.business.count({ where: { status: "PUBLISHED", verifiedAt: null } }),
      db.newsArticle.count({ where: { status: "PUBLISHED", sourceName: null, sourceUrl: null } }),
      db.place.count({ where: { status: "PUBLISHED", updatedAt: { lt: yearAgo } } }),
      db.business.count({ where: { status: "PUBLISHED", updatedAt: { lt: yearAgo } } }),
      db.media.count({ where: { alt: "" } }),
    ]),
  ]);
  const [placesNoCover, bizNoCover, bizNoPhone, bizUnverified, newsNoSource, stalePlaces, staleBiz, mediaNoAlt] = health;
  return {
    pending, openCorrections, newMessages, recentContributions, activity, contentCounts,
    health: { placesNoCover, bizNoCover, bizNoPhone, bizUnverified, newsNoSource, stalePlaces, staleBiz, mediaNoAlt },
  };
}

const TABS: Record<string, ContributionStatus[]> = {
  open: ["SUBMITTED", "UNDER_REVIEW"],
  waiting: ["CHANGES_REQUESTED"],
  approved: ["APPROVED"],
  done: ["PUBLISHED", "REJECTED", "WITHDRAWN"],
};
const TYPES: ContributionType[] = ["PLACE", "BUSINESS", "SERVICE", "NEWS", "BLOG", "PHOTO"];

export async function listContributions(q: { tab?: string; type?: string; page: number }) {
  const tab = q.tab && q.tab in TABS ? q.tab : "open";
  const type = TYPES.includes(q.type as ContributionType) ? (q.type as ContributionType) : undefined;
  const where = { status: { in: TABS[tab] }, ...(type ? { type } : {}) };
  const [total, counts, rows] = await Promise.all([
    db.contribution.count({ where }),
    Promise.all(Object.values(TABS).map((s) => db.contribution.count({ where: { status: { in: s } } }))),
    db.contribution.findMany({
      where, orderBy: { submittedAt: tab === "open" ? "asc" : "desc" }, skip: (q.page - 1) * 25, take: 25,
      include: { user: { select: { name: true, email: true } }, reviewer: { select: { name: true } } },
    }),
  ]);
  return { tab, type: type ?? null, total, rows, pages: Math.max(1, Math.ceil(total / 25)), counts: Object.fromEntries(Object.keys(TABS).map((k, i) => [k, counts[i]])) };
}

export async function getContribution(id: string) {
  const c = await db.contribution.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true, status: true, _count: { select: { contributions: true } } } },
      reviewer: { select: { name: true } },
    },
  });
  if (!c) throw notFound();
  const [media, published, history] = await Promise.all([
    c.mediaIds.length ? db.media.findMany({ where: { id: { in: c.mediaIds } }, select: { id: true, url: true, alt: true, width: true, height: true } }) : Promise.resolve([]),
    db.contribution.count({ where: { userId: c.userId, status: "PUBLISHED" } }),
    db.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } }),
  ]);
  const linked =
    c.placeId ? `/place/${c.placeId}` : c.businessId ? `/business/${c.businessId}` : c.serviceId ? `/service/${c.serviceId}`
    : c.newsId ? `/news/${c.newsId}` : c.blogId ? `/blog/${c.blogId}` : c.photoId ? `/photo/${c.photoId}` : null;
  return { contribution: { ...c, payload: c.payload as Record<string, unknown> }, media, published, history, linked };
}

export async function listCorrections(q: { closed: boolean; page: number }) {
  const where = { status: q.closed ? { in: ["RESOLVED", "DISMISSED"] as ("RESOLVED" | "DISMISSED")[] } : { in: ["OPEN", "IN_REVIEW"] as ("OPEN" | "IN_REVIEW")[] } };
  const [total, rows] = await Promise.all([
    db.correction.count({ where }),
    db.correction.findMany({
      where, orderBy: { createdAt: q.closed ? "desc" : "asc" }, skip: (q.page - 1) * 20, take: 20,
      include: {
        user: { select: { name: true, email: true } }, resolver: { select: { name: true } },
        place: { select: { id: true, name: true } }, business: { select: { id: true, name: true } }, service: { select: { id: true, name: true } },
        news: { select: { id: true, title: true } }, blog: { select: { id: true, title: true } }, photo: { select: { id: true, title: true } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / 20)) };
}
