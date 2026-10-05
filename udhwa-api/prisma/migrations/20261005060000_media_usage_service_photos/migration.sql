-- Production hardening: service ↔ photo, photo categories, rich-text media
-- tracking, safer media deletion and lookup indexes.

-- ── Media: hard deletes replace soft deletes ──────────────────
-- Soft-deleted rows already had their Cloudinary asset destroyed, so remove the
-- rows (covers pointing at them fall back to NULL through their FKs). The
-- "deletedAt" column itself is kept (unused) so the previous release keeps
-- working while a deploy rolls over. Drop it in a later release.
DELETE FROM "Media" m
WHERE m."deletedAt" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Photo" p WHERE p."mediaId" = m."id");
UPDATE "Media" SET "deletedAt" = NULL WHERE "deletedAt" IS NOT NULL;

-- A photo's media can no longer be deleted out from under it.
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_mediaId_fkey";
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Rich-text media usage ─────────────────────────────────────
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaUsage_mediaId_ownerType_ownerId_field_key" ON "MediaUsage"("mediaId", "ownerType", "ownerId", "field");
CREATE INDEX "MediaUsage_ownerType_ownerId_idx" ON "MediaUsage"("ownerType", "ownerId");
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_ownerType_chk"
  CHECK ("ownerType" IN ('place', 'business', 'service', 'news', 'blog', 'contribution'));

-- ── Photo: service + category ─────────────────────────────────
ALTER TABLE "Photo" ADD COLUMN "serviceId" TEXT;
ALTER TABLE "Photo" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Photo_serviceId_idx" ON "Photo"("serviceId");
CREATE INDEX "Photo_newsId_idx" ON "Photo"("newsId");
CREATE INDEX "Photo_blogId_idx" ON "Photo"("blogId");
CREATE INDEX "Photo_categoryId_idx" ON "Photo"("categoryId");

-- ── Lookup indexes ────────────────────────────────────────────
CREATE INDEX "Session_expires_idx" ON "Session"("expires");
CREATE INDEX "Service_placeId_idx" ON "Service"("placeId");
CREATE INDEX "Service_localityId_idx" ON "Service"("localityId");
CREATE INDEX "Contribution_placeId_idx" ON "Contribution"("placeId");
CREATE INDEX "Contribution_businessId_idx" ON "Contribution"("businessId");
CREATE INDEX "Contribution_serviceId_idx" ON "Contribution"("serviceId");
CREATE INDEX "Contribution_newsId_idx" ON "Contribution"("newsId");
CREATE INDEX "Contribution_blogId_idx" ON "Contribution"("blogId");
CREATE INDEX "Contribution_photoId_idx" ON "Contribution"("photoId");
CREATE INDEX "Correction_placeId_idx" ON "Correction"("placeId");
CREATE INDEX "Correction_businessId_idx" ON "Correction"("businessId");
CREATE INDEX "Correction_serviceId_idx" ON "Correction"("serviceId");
CREATE INDEX "Correction_newsId_idx" ON "Correction"("newsId");
CREATE INDEX "Correction_blogId_idx" ON "Correction"("blogId");
CREATE INDEX "Correction_photoId_idx" ON "Correction"("photoId");
CREATE INDEX "Redirect_toPath_idx" ON "Redirect"("toPath");
