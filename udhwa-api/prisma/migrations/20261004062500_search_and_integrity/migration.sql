-- Full-text search indexes (language-neutral 'simple' config so Hindi and
-- English content are both tokenised). Queried by src/lib/search.ts —
-- the expressions there must match these exactly for the indexes to be used.
CREATE FUNCTION udhwa_join_text(text[]) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT coalesce(array_to_string($1, ' '), '') $$;

CREATE INDEX "Place_search_idx" ON "Place" USING GIN (to_tsvector('simple', coalesce("name",'') || ' ' || coalesce("summary",'') || ' ' || coalesce("address",'')));
CREATE INDEX "Business_search_idx" ON "Business" USING GIN (to_tsvector('simple', coalesce("name",'') || ' ' || coalesce("summary",'') || ' ' || coalesce("address",'') || ' ' || udhwa_join_text("offerings")));
CREATE INDEX "Service_search_idx" ON "Service" USING GIN (to_tsvector('simple', coalesce("name",'') || ' ' || coalesce("summary",'') || ' ' || coalesce("providerName",'') || ' ' || coalesce("serviceArea",'')));
CREATE INDEX "NewsArticle_search_idx" ON "NewsArticle" USING GIN (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("excerpt",'')));
CREATE INDEX "BlogPost_search_idx" ON "BlogPost" USING GIN (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("excerpt",'')));
CREATE INDEX "Photo_search_idx" ON "Photo" USING GIN (to_tsvector('simple', coalesce("title",'') || ' ' || coalesce("caption",'')));

-- A correction always targets exactly one published entity.
ALTER TABLE "Correction" ADD CONSTRAINT "Correction_single_target_chk"
  CHECK (num_nonnulls("placeId", "businessId", "serviceId", "newsId", "blogId", "photoId") = 1);

-- Published content must have a publish date.
ALTER TABLE "Place"       ADD CONSTRAINT "Place_published_at_chk"       CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "Business"    ADD CONSTRAINT "Business_published_at_chk"    CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "Service"     ADD CONSTRAINT "Service_published_at_chk"     CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_published_at_chk" CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "BlogPost"    ADD CONSTRAINT "BlogPost_published_at_chk"    CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
ALTER TABLE "Photo"       ADD CONSTRAINT "Photo_published_at_chk"       CHECK ("status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL);
