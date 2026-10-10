-- Repairs the legacy udhwa.in (*.html) redirects on databases that were seeded
-- with --minimal (or before the article redirects existed). Idempotent: existing
-- rows are never overwritten, and an article redirect is only created when its
-- destination is published, so unknown legacy URLs keep returning 404.

-- Section pages (always valid).
INSERT INTO "Redirect" ("id", "fromPath", "toPath", "permanent") VALUES
  ('legacy_index_html',      '/index.html',      '/',            true),
  ('legacy_news_html',       '/news.html',       '/news',        true),
  ('legacy_blogs_html',      '/blogs.html',      '/blogs',       true),
  ('legacy_listings_html',   '/listings.html',   '/businesses',  true),
  ('legacy_services_html',   '/services.html',   '/services',    true),
  ('legacy_about_html',      '/about.html',      '/about',       true),
  ('legacy_contact_html',    '/contact.html',    '/contact',     true),
  ('legacy_manifesto_html',  '/manifesto.html',  '/manifesto',   true)
ON CONFLICT ("fromPath") DO NOTHING;

-- Old news-N / blog-N articles → the article each one became (when it is published).
INSERT INTO "Redirect" ("id", "fromPath", "toPath", "permanent")
SELECT 'legacy_' || m."key", m."fromPath", m."prefix" || a."slug", true
FROM (VALUES
  ('news_2', '/news/news-2.html', '/news/', 'jac-board-exam-feb-march-2026-teacher-deputation', 'news'),
  ('news_3', '/news/news-3.html', '/news/', 'plus-2-high-school-udhwa-annual-sports-2026', 'news'),
  ('news_4', '/news/news-4.html', '/news/', 'heavy-crowd-hp-petrol-pump-udhwa-price-hike-rumours', 'news'),
  ('blog_1', '/blogs/blog-1.html', '/blogs/', 'computer-era-mein-skills-ka-mahatva', 'blog'),
  ('blog_2', '/blogs/blog-2.html', '/blogs/', 'phone-se-coding-shuru-kare', 'blog'),
  ('blog_3', '/blogs/blog-3.html', '/blogs/', 'udhwa-lake-bird-sanctuary-guide', 'blog')
) AS m("key", "fromPath", "prefix", "slug", "kind")
JOIN (
  SELECT "slug", 'news' AS "kind" FROM "NewsArticle" WHERE "status" = 'PUBLISHED' AND "publishedAt" <= now()
  UNION ALL
  SELECT "slug", 'blog' AS "kind" FROM "BlogPost" WHERE "status" = 'PUBLISHED' AND "publishedAt" <= now()
) a ON a."slug" = m."slug" AND a."kind" = m."kind"
ON CONFLICT ("fromPath") DO NOTHING;

-- news-1 (ICT Championship): temporary → /news while the article is a draft;
-- permanent → the article itself as soon as it is published.
INSERT INTO "Redirect" ("id", "fromPath", "toPath", "permanent")
VALUES ('legacy_news_1', '/news/news-1.html', '/news', false)
ON CONFLICT ("fromPath") DO NOTHING;
UPDATE "Redirect" r
SET "toPath" = '/news/' || a."slug", "permanent" = true
FROM "NewsArticle" a
WHERE r."fromPath" = '/news/news-1.html' AND r."toPath" = '/news'
  AND a."slug" = 'jharkhand-ict-championship-eshiksha-mahotsav-2025'
  AND a."status" = 'PUBLISHED' AND a."publishedAt" <= now();
