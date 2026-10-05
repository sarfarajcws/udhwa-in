-- Legacy udhwa.in links that existed in the old navigation, plus the old
-- news-1 article (a draft for now) as a temporary redirect. Idempotent.
INSERT INTO "Redirect" ("id", "fromPath", "toPath", "permanent")
VALUES
  ('legacy_contribute_html', '/contribute.html', '/contribute', true),
  ('legacy_local_guide_html', '/local-guide.html', '/places', true)
ON CONFLICT ("fromPath") DO NOTHING;
UPDATE "Redirect" SET "permanent" = false WHERE "fromPath" = '/news/news-1.html' AND "toPath" = '/news';
