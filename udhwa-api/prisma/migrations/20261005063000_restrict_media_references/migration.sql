-- An image can't be deleted while it is somebody's cover: the API already
-- refuses, and now the database enforces it too (no silent NULLing).
ALTER TABLE "Place" DROP CONSTRAINT "Place_coverId_fkey";
ALTER TABLE "Place" ADD CONSTRAINT "Place_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Business" DROP CONSTRAINT "Business_coverId_fkey";
ALTER TABLE "Business" ADD CONSTRAINT "Business_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service" DROP CONSTRAINT "Service_coverId_fkey";
ALTER TABLE "Service" ADD CONSTRAINT "Service_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NewsArticle" DROP CONSTRAINT "NewsArticle_coverId_fkey";
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_coverId_fkey";
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
