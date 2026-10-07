import { db, type CategoryKind, type Prisma } from "@/db";

/**
 * Read-side queries for the public site (served under /v1/*). Everything here only returns
 * PUBLISHED content whose publish time has arrived (so admins can schedule).
 */

export const PAGE_SIZE = 12;

const live = () => ({ status: "PUBLISHED" as const, publishedAt: { lte: new Date() } });

const mediaSelect = { select: { url: true, alt: true, width: true, height: true, caption: true, credit: true } } as const;
const categorySelect = { select: { name: true, slug: true } } as const;

// ── Shared card shapes ───────────────────────────────────────
export const placeCard = {
  id: true, slug: true, name: true, summary: true, address: true,
  cover: mediaSelect, category: categorySelect, locality: { select: { name: true } },
} satisfies Prisma.PlaceSelect;

export const businessCard = {
  id: true, slug: true, name: true, summary: true, address: true, phone: true, verifiedAt: true, hoursNote: true,
  cover: mediaSelect, category: categorySelect,
} satisfies Prisma.BusinessSelect;

export const serviceCard = {
  id: true, slug: true, name: true, summary: true, providerName: true, providerType: true, serviceArea: true, availability: true,
  cover: mediaSelect, category: categorySelect,
} satisfies Prisma.ServiceSelect;

export const newsCard = {
  id: true, slug: true, title: true, excerpt: true, publishedAt: true, language: true,
  cover: mediaSelect, category: categorySelect, author: { select: { name: true, slug: true } },
} satisfies Prisma.NewsArticleSelect;

export const blogCard = {
  id: true, slug: true, title: true, excerpt: true, publishedAt: true, readingMinutes: true, language: true,
  cover: mediaSelect, category: categorySelect, author: { select: { name: true, slug: true, avatarUrl: true } },
} satisfies Prisma.BlogPostSelect;

/** Related content is only linked when it is live itself (otherwise the link would 404). */
const liveLink = <T extends Record<string, true>>(select: T) => ({ select: { ...select, status: true, publishedAt: true } });

type Linkable = { status: string; publishedAt: Date | null } | null;
const isLive = (r: Linkable) => Boolean(r && r.status === "PUBLISHED" && r.publishedAt && r.publishedAt <= new Date());

/** Nulls out related records that aren't live, so clients never link to a 404. */
function liveLinks<T extends Record<string, unknown>>(row: T, keys: (keyof T)[]): T {
  const out = { ...row };
  for (const k of keys) if (out[k] && !isLive(out[k] as unknown as Linkable)) (out as Record<keyof T, unknown>)[k] = null;
  return out;
}
const photoLinks = <T extends { place: Linkable; business: Linkable; service: Linkable }>(rows: T[]) => rows.map((r) => liveLinks(r, ["place", "business", "service"]));

export const photoCard = {
  id: true, title: true, caption: true, credit: true, publishedAt: true,
  media: mediaSelect,
  place: liveLink({ name: true, slug: true }),
  business: liveLink({ name: true, slug: true }),
  service: liveLink({ name: true, slug: true }),
  category: categorySelect,
  contributor: { select: { name: true, username: true } },
} satisfies Prisma.PhotoSelect;

export type PlaceCardData = Prisma.PlaceGetPayload<{ select: typeof placeCard }>;
export type BusinessCardData = Prisma.BusinessGetPayload<{ select: typeof businessCard }>;
export type ServiceCardData = Prisma.ServiceGetPayload<{ select: typeof serviceCard }>;
export type NewsCardData = Prisma.NewsArticleGetPayload<{ select: typeof newsCard }>;
export type BlogCardData = Prisma.BlogPostGetPayload<{ select: typeof blogCard }>;
export type PhotoCardData = Prisma.PhotoGetPayload<{ select: typeof photoCard }>;

// ── Geography ────────────────────────────────────────────────
export type Area = { locality: string | null; district: string | null; region: string | null; country: string | null };

/**
 * Address parts for structured data, derived from the locality tree
 * (e.g. Udhwa → Sahibganj → Jharkhand → India) rather than hard-coded.
 */
export async function areaFor(localityId: string | null | undefined): Promise<Area | null> {
  if (!localityId) return null;
  const all = await db.locality.findMany({ select: { id: true, name: true, kind: true, parentId: true } });
  const byId = new Map(all.map((l) => [l.id, l]));
  const area: Area = { locality: null, district: null, region: null, country: null };
  let cur = byId.get(localityId);
  for (let depth = 0; cur && depth < 12; depth++) {
    if (["VILLAGE", "TOWN", "CITY", "NEIGHBORHOOD", "BLOCK"].includes(cur.kind)) area.locality ??= cur.name;
    else if (cur.kind === "DISTRICT") area.district ??= cur.name;
    else if (cur.kind === "STATE" || cur.kind === "REGION") area.region ??= cur.name;
    else if (cur.kind === "COUNTRY") area.country ??= cur.name;
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return area;
}

// ── Site-level ───────────────────────────────────────────────
export const getPrimaryLocality = async () =>
  db.locality.findFirst({ where: { isPrimary: true }, include: { parent: { include: { parent: true } } } });


export const getCategories = async (kind: CategoryKind) =>
  db.category.findMany({ where: { kind }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } });


export async function getHomeData() {
  const [places, businesses, services, news, blogs, photos, counts] = await Promise.all([
    db.place.findMany({ where: live(), select: placeCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 4 }),
    db.business.findMany({ where: live(), select: businessCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 3 }),
    db.service.findMany({ where: live(), select: serviceCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 4 }),
    db.newsArticle.findMany({ where: live(), select: newsCard, orderBy: { publishedAt: "desc" }, take: 4 }),
    db.blogPost.findMany({ where: live(), select: blogCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 3 }),
    db.photo.findMany({ where: live(), select: photoCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 6 }),
    Promise.all([db.place.count({ where: live() }), db.business.count({ where: live() }), db.service.count({ where: live() })]),
  ]);
  return { places, businesses, services, news, blogs, photos: photoLinks(photos), counts: { places: counts[0], businesses: counts[1], services: counts[2] } };
}

// ── Listing helpers ──────────────────────────────────────────
type ListArgs = { category?: string; q?: string; page?: number };

function textFilter(q: string | undefined, fields: string[]) {
  if (!q) return {};
  return { OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) };
}

async function paginate<T>(page: number, count: Promise<number>, rows: (skip: number) => Promise<T[]>) {
  const total = await count;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pages);
  return { items: await rows((current - 1) * PAGE_SIZE), total, page: current, pages };
}

export async function listPlaces({ category, q, page = 1 }: ListArgs) {
  const where: Prisma.PlaceWhereInput = { ...live(), ...(category ? { category: { slug: category, kind: "PLACE" } } : {}), ...textFilter(q, ["name", "summary", "address"]) };
  return paginate(page, db.place.count({ where }), (skip) =>
    db.place.findMany({ where, select: placeCard, orderBy: [{ featured: "desc" }, { name: "asc" }], skip, take: PAGE_SIZE }),
  );
}

export async function listBusinesses({ category, q, page = 1 }: ListArgs) {
  const where: Prisma.BusinessWhereInput = { ...live(), ...(category ? { category: { slug: category, kind: "BUSINESS" } } : {}), ...textFilter(q, ["name", "summary", "address"]) };
  return paginate(page, db.business.count({ where }), (skip) =>
    db.business.findMany({ where, select: businessCard, orderBy: [{ featured: "desc" }, { name: "asc" }], skip, take: PAGE_SIZE }),
  );
}

export async function listServices({ category, q, page = 1 }: ListArgs) {
  const where: Prisma.ServiceWhereInput = { ...live(), ...(category ? { category: { slug: category, kind: "SERVICE" } } : {}), ...textFilter(q, ["name", "summary", "providerName", "serviceArea"]) };
  return paginate(page, db.service.count({ where }), (skip) =>
    db.service.findMany({ where, select: serviceCard, orderBy: [{ featured: "desc" }, { name: "asc" }], skip, take: PAGE_SIZE }),
  );
}

export async function listNews({ category, q, page = 1 }: ListArgs) {
  const where: Prisma.NewsArticleWhereInput = { ...live(), ...(category ? { category: { slug: category, kind: "NEWS" } } : {}), ...textFilter(q, ["title", "excerpt"]) };
  return paginate(page, db.newsArticle.count({ where }), (skip) =>
    db.newsArticle.findMany({ where, select: newsCard, orderBy: { publishedAt: "desc" }, skip, take: PAGE_SIZE }),
  );
}

export async function listBlogs({ category, q, page = 1, tag }: ListArgs & { tag?: string }) {
  const where: Prisma.BlogPostWhereInput = {
    ...live(),
    ...(category ? { category: { slug: category, kind: "BLOG" } } : {}),
    ...(tag ? { tags: { some: { slug: tag } } } : {}),
    ...textFilter(q, ["title", "excerpt"]),
  };
  return paginate(page, db.blogPost.count({ where }), (skip) =>
    db.blogPost.findMany({ where, select: blogCard, orderBy: { publishedAt: "desc" }, skip, take: PAGE_SIZE }),
  );
}

export async function listPhotos({ page = 1, place, service, category }: { page?: number; place?: string; service?: string; category?: string }) {
  const where: Prisma.PhotoWhereInput = {
    ...live(),
    ...(place ? { place: { slug: place } } : {}),
    ...(service ? { service: { slug: service } } : {}),
    ...(category ? { category: { slug: category, kind: "PHOTO" } } : {}),
  };
  const size = 24;
  const total = await db.photo.count({ where });
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const items = await db.photo.findMany({ where, select: photoCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], skip: (current - 1) * size, take: size });
  return { items: photoLinks(items), total, page: current, pages };
}

// ── Detail pages ─────────────────────────────────────────────
export const getPlace = async (slug: string) => {
  const place = await db.place.findFirst({
    where: { slug, ...live() },
    include: { cover: mediaSelect, category: categorySelect, locality: { include: { parent: { include: { parent: true } } } } },
  });
  if (!place) return null;
  const [area, businesses, services, news, blogs, photos] = await Promise.all([
    areaFor(place.localityId),
    db.business.findMany({ where: { placeId: place.id, ...live() }, select: businessCard, take: 6 }),
    db.service.findMany({ where: { OR: [{ placeId: place.id }, { business: { placeId: place.id } }], ...live() }, select: serviceCard, take: 6 }),
    db.newsArticle.findMany({ where: { OR: [{ placeId: place.id }, { business: { placeId: place.id } }], ...live() }, select: newsCard, orderBy: { publishedAt: "desc" }, take: 4 }),
    db.blogPost.findMany({ where: { placeId: place.id, ...live() }, select: blogCard, orderBy: { publishedAt: "desc" }, take: 4 }),
    db.photo.findMany({ where: { placeId: place.id, ...live() }, select: photoCard, orderBy: { publishedAt: "desc" }, take: 9 }),
  ]);
  return { place, area, businesses, services, news, blogs, photos: photoLinks(photos) };
};

export const getBusiness = async (slug: string) => {
  const found = await db.business.findFirst({
    where: { slug, ...live() },
    include: { cover: mediaSelect, category: categorySelect, locality: true, place: liveLink({ name: true, slug: true }) },
  });
  if (!found) return null;
  const business = liveLinks(found, ["place"]);
  const [area, services, news, blogs, photos] = await Promise.all([
    areaFor(business.localityId),
    db.service.findMany({ where: { businessId: business.id, ...live() }, select: serviceCard }),
    db.newsArticle.findMany({ where: { businessId: business.id, ...live() }, select: newsCard, orderBy: { publishedAt: "desc" }, take: 4 }),
    db.blogPost.findMany({ where: { businessId: business.id, ...live() }, select: blogCard, take: 4 }),
    db.photo.findMany({ where: { businessId: business.id, ...live() }, select: photoCard, take: 9 }),
  ]);
  const nearby = business.placeId
    ? await db.business.findMany({ where: { placeId: business.placeId, id: { not: business.id }, ...live() }, select: businessCard, take: 3 })
    : [];
  return { business, area, services, news, blogs, photos: photoLinks(photos), nearby };
};

export const getService = async (slug: string) => {
  const found = await db.service.findFirst({
    where: { slug, ...live() },
    include: {
      cover: mediaSelect, category: categorySelect, locality: true,
      business: liveLink({ name: true, slug: true, phone: true, address: true }),
      place: liveLink({ name: true, slug: true }),
    },
  });
  if (!found) return null;
  const service = liveLinks(found, ["business", "place"]);
  const [area, related, blogs, photos] = await Promise.all([
    areaFor(service.localityId),
    service.categoryId
      ? db.service.findMany({ where: { categoryId: service.categoryId, id: { not: service.id }, ...live() }, select: serviceCard, take: 3 })
      : Promise.resolve([]),
    db.blogPost.findMany({ where: { serviceId: service.id, ...live() }, select: blogCard, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.photo.findMany({ where: { serviceId: service.id, ...live() }, select: photoCard, orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 9 }),
  ]);
  return { service, area, related, blogs, photos: photoLinks(photos) };
};

export const getNews = async (slug: string) => {
  const found = await db.newsArticle.findFirst({
    where: { slug, ...live() },
    include: {
      cover: mediaSelect, category: categorySelect, tags: { select: { name: true, slug: true } },
      author: true, locality: true,
      place: liveLink({ name: true, slug: true }),
      business: liveLink({ name: true, slug: true }),
    },
  });
  if (!found) return null;
  const article = liveLinks(found, ["place", "business"]);
  const [more, photos] = await Promise.all([
    db.newsArticle.findMany({ where: { id: { not: article.id }, ...live() }, select: newsCard, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.photo.findMany({ where: { newsId: article.id, ...live() }, select: photoCard }),
  ]);
  return { article, more, photos: photoLinks(photos) };
};

export const getBlog = async (slug: string) => {
  const found = await db.blogPost.findFirst({
    where: { slug, ...live() },
    include: {
      cover: mediaSelect, category: categorySelect, tags: { select: { name: true, slug: true } },
      author: true,
      place: liveLink({ name: true, slug: true, summary: true }),
      business: liveLink({ name: true, slug: true }),
      service: liveLink({ name: true, slug: true }),
      relatedTo: { where: live(), select: blogCard, orderBy: { publishedAt: "desc" }, take: 6 },
      relatedFrom: { where: live(), select: blogCard, orderBy: { publishedAt: "desc" }, take: 6 },
    },
  });
  if (!found) return null;
  const { relatedTo, relatedFrom, ...rest } = found;
  const post = liveLinks(rest, ["place", "business", "service"]);
  // Hand-picked related posts first (either direction), then automatic ones by category/tags.
  const picked = [...relatedTo, ...relatedFrom].filter((b, i, all) => all.findIndex((x) => x.id === b.id) === i);
  const auto = await db.blogPost.findMany({
    where: {
      id: { notIn: [post.id, ...picked.map((b) => b.id)] }, ...live(),
      OR: [{ categoryId: post.categoryId ?? undefined }, { tags: { some: { slug: { in: post.tags.map((t) => t.slug) } } } }],
    },
    select: blogCard, orderBy: { publishedAt: "desc" }, take: Math.max(0, 3 - picked.length),
  });
  return { post, related: [...picked, ...auto] };
};

export const getPhoto = async (id: string) => {
  const found = await db.photo.findFirst({
    where: { id, ...live() },
    include: {
      media: mediaSelect, tags: { select: { name: true, slug: true } }, category: categorySelect,
      place: { select: { name: true, slug: true, status: true, publishedAt: true, address: true, latitude: true, longitude: true } },
      business: liveLink({ name: true, slug: true }),
      service: liveLink({ name: true, slug: true }),
      news: liveLink({ title: true, slug: true }),
      blog: liveLink({ title: true, slug: true }),
      contributor: { select: { name: true, username: true } },
    },
  });
  return found ? liveLinks(found, ["place", "business", "service", "news", "blog"]) : null;
};


export const getAuthor = async (slug: string) => {
  const author = await db.author.findUnique({ where: { slug } });
  if (!author) return null;
  const [news, blogs] = await Promise.all([
    db.newsArticle.findMany({ where: { authorId: author.id, ...live() }, select: newsCard, orderBy: { publishedAt: "desc" }, take: 20 }),
    db.blogPost.findMany({ where: { authorId: author.id, ...live() }, select: blogCard, orderBy: { publishedAt: "desc" }, take: 20 }),
  ]);
  return { author, news, blogs };
};

/** Old URL → new URL (slug changes, legacy .html paths). */
export async function findRedirect(path: string) {
  return db.redirect.findUnique({ where: { fromPath: path } });
}

/** Every published, indexable entity for the sitemap. */
export async function getSitemapData() {
  const live = { status: "PUBLISHED" as const, publishedAt: { lte: new Date() }, noIndex: false, canonicalUrl: null };
  const sel = { slug: true, updatedAt: true } as const;
  const [places, businesses, services, news, blogs, photos, authors] = await Promise.all([
    db.place.findMany({ where: live, select: sel }),
    db.business.findMany({ where: live, select: sel }),
    db.service.findMany({ where: live, select: sel }),
    db.newsArticle.findMany({ where: live, select: sel, orderBy: { publishedAt: "desc" } }),
    db.blogPost.findMany({ where: live, select: sel, orderBy: { publishedAt: "desc" } }),
    db.photo.findMany({ where: { status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { id: true, updatedAt: true } }),
    db.author.findMany({ where: { OR: [{ news: { some: { status: "PUBLISHED", publishedAt: { lte: new Date() } } } }, { blogs: { some: { status: "PUBLISHED", publishedAt: { lte: new Date() } } } }] }, select: sel }),
  ]);
  // Category listing pages that actually have live content.
  const some = { some: { status: "PUBLISHED" as const, publishedAt: { lte: new Date() } } };
  const categories = await db.category.findMany({
    where: { OR: [{ kind: "PLACE", places: some }, { kind: "BUSINESS", businesses: some }, { kind: "SERVICE", services: some }, { kind: "NEWS", news: some }, { kind: "BLOG", blogs: some }, { kind: "PHOTO", photos: some }] },
    select: { kind: true, slug: true, updatedAt: true },
  });
  return { places, businesses, services, news, blogs, photos, authors, categories };
}
