import { db } from "@/db";
import { SEARCH_KINDS, toTsQuery, type SearchKind } from "@/lib/search-query";

export { toTsQuery };
export { SEARCH_KINDS, type SearchKind } from "@/lib/search-query";

/**
 * Cross-platform search over published content using Postgres full-text
 * search ('simple' config — works for English, Hindi and Hinglish).
 * The to_tsvector(...) expressions mirror the GIN indexes created in
 * prisma/migrations/*_search_and_integrity so the indexes are used.
 * Prefix matching (term:*) gives useful results while typing.
 */

export type SearchHit = {
  kind: SearchKind;
  id: string;
  slug: string | null;
  title: string;
  snippet: string;
  imageUrl: string | null;
  imageAlt: string | null;
  date: Date | null;
  rank: number;
};

export async function search(q: string, kind?: SearchKind, limit = 40): Promise<SearchHit[]> {
  const tsq = toTsQuery(q);
  if (!tsq) return [];

  const kinds = kind ? [kind] : (SEARCH_KINDS.map((k) => k.kind) as SearchKind[]);
  const per = kind ? limit : 12;

  const queries: Promise<SearchHit[]>[] = [];

  if (kinds.includes("place"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'place' AS kind, p.id, p.slug, p.name AS title, p.summary AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", p."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(p."name",'') || ' ' || coalesce(p."summary",'') || ' ' || coalesce(p."address",'')), to_tsquery('simple', ${tsq})) * 1.3 AS rank
      FROM "Place" p LEFT JOIN "Media" m ON m.id = p."coverId"
      WHERE p.status = 'PUBLISHED' AND p."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(p."name",'') || ' ' || coalesce(p."summary",'') || ' ' || coalesce(p."address",'')) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC LIMIT ${per}`);

  if (kinds.includes("business"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'business' AS kind, b.id, b.slug, b.name AS title, b.summary AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", b."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(b."name",'') || ' ' || coalesce(b."summary",'') || ' ' || coalesce(b."address",'') || ' ' || udhwa_join_text(b."offerings")), to_tsquery('simple', ${tsq})) * 1.2 AS rank
      FROM "Business" b LEFT JOIN "Media" m ON m.id = b."coverId"
      WHERE b.status = 'PUBLISHED' AND b."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(b."name",'') || ' ' || coalesce(b."summary",'') || ' ' || coalesce(b."address",'') || ' ' || udhwa_join_text(b."offerings")) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC LIMIT ${per}`);

  if (kinds.includes("service"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'service' AS kind, s.id, s.slug, s.name AS title, s.summary AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", s."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(s."name",'') || ' ' || coalesce(s."summary",'') || ' ' || coalesce(s."providerName",'') || ' ' || coalesce(s."serviceArea",'')), to_tsquery('simple', ${tsq})) * 1.1 AS rank
      FROM "Service" s LEFT JOIN "Media" m ON m.id = s."coverId"
      WHERE s.status = 'PUBLISHED' AND s."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(s."name",'') || ' ' || coalesce(s."summary",'') || ' ' || coalesce(s."providerName",'') || ' ' || coalesce(s."serviceArea",'')) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC LIMIT ${per}`);

  if (kinds.includes("news"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'news' AS kind, n.id, n.slug, n.title, n.excerpt AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", n."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(n."title",'') || ' ' || coalesce(n."excerpt",'')), to_tsquery('simple', ${tsq})) AS rank
      FROM "NewsArticle" n LEFT JOIN "Media" m ON m.id = n."coverId"
      WHERE n.status = 'PUBLISHED' AND n."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(n."title",'') || ' ' || coalesce(n."excerpt",'')) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC, n."publishedAt" DESC LIMIT ${per}`);

  if (kinds.includes("blog"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'blog' AS kind, b.id, b.slug, b.title, b.excerpt AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", b."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(b."title",'') || ' ' || coalesce(b."excerpt",'')), to_tsquery('simple', ${tsq})) AS rank
      FROM "BlogPost" b LEFT JOIN "Media" m ON m.id = b."coverId"
      WHERE b.status = 'PUBLISHED' AND b."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(b."title",'') || ' ' || coalesce(b."excerpt",'')) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC LIMIT ${per}`);

  if (kinds.includes("photo"))
    queries.push(db.$queryRaw<SearchHit[]>`
      SELECT 'photo' AS kind, ph.id, NULL AS slug, ph.title, coalesce(ph.caption, '') AS snippet, m.url AS "imageUrl", m.alt AS "imageAlt", ph."publishedAt" AS date,
             ts_rank(to_tsvector('simple', coalesce(ph."title",'') || ' ' || coalesce(ph."caption",'')), to_tsquery('simple', ${tsq})) * 0.8 AS rank
      FROM "Photo" ph JOIN "Media" m ON m.id = ph."mediaId"
      WHERE ph.status = 'PUBLISHED' AND ph."publishedAt" <= now()
        AND to_tsvector('simple', coalesce(ph."title",'') || ' ' || coalesce(ph."caption",'')) @@ to_tsquery('simple', ${tsq})
      ORDER BY rank DESC LIMIT ${per}`);

  const results = (await Promise.all(queries)).flat();
  return results.sort((a, b) => Number(b.rank) - Number(a.rank)).slice(0, limit);
}

