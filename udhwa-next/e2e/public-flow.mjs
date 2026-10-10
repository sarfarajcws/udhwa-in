// PUBLIC flow + SEO audit: home → search → place → business → service → news →
// blog → photos, checking metadata, canonicals, JSON-LD, breadcrumbs, Open
// Graph, sitemap, robots, noindex rules, 404s and legacy redirects.
import { ADMIN, API, WEB, check, done, jsonLd, launch, meta, newPage, open, section } from './lib.mjs';

const browser = await launch();
const page = await newPage(browser);
const abs = (p) => `${WEB}${p}`;

section('Sitemap and robots');
const sitemap = await (await fetch(abs('/sitemap.xml'))).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const first = (prefix) => locs.find((l) => l.startsWith(abs(prefix)) && l !== abs(prefix.replace(/\/$/, '')));
const urls = { place: first('/places/'), business: first('/businesses/'), service: first('/services/'), news: first('/news/'), blog: first('/blogs/'), photo: first('/photos/') };
for (const [k, v] of Object.entries(urls)) check(Boolean(v), `sitemap lists ${k} pages`);
check(locs.every((l) => l.startsWith(WEB)), 'every sitemap URL is absolute on the site origin');
const draftSlug = 'jharkhand-ict-championship-eshiksha-mahotsav-2025'; // seeded as a draft
check(!locs.some((l) => l.includes(draftSlug)), 'draft content (legacy ICT article) is not in the sitemap');
check(!locs.some((l) => /\/(account|signin|search|contribute\/)/.test(l)), 'private/noindex pages are not in the sitemap');
const robots = await (await fetch(abs('/robots.txt'))).text();
check(/Sitemap: .*\/sitemap\.xml/.test(robots) && /Disallow: \/api\//.test(robots), 'robots.txt points to the sitemap and only blocks the API', robots.replace(/\n/g, ' | '));

section('Home → search');
await open(page, abs('/'));
let m = await meta(page);
check(m.h1.length === 1, 'home has one h1', JSON.stringify(m.h1));
check(m.canonical === abs('/') || m.canonical === WEB, 'home canonical', m.canonical);
const homeLd = await jsonLd(page);
check(homeLd.some((d) => d['@type'] === 'WebSite') && homeLd.some((d) => d['@type'] === 'Organization'), 'home has WebSite + Organization JSON-LD');
await page.locator('main input[type=search]').first().fill('lake');
await Promise.all([page.waitForURL('**/search?**'), page.locator('main input[type=search]').first().press('Enter')]);
const gotResults = await page.locator('main li h2').first().waitFor({ timeout: 15000 }).then(() => true, () => false);
check(gotResults, 'search returns results for “lake”');
m = await meta(page);
check(/noindex/.test(m.robots ?? ''), 'search results are noindex', m.robots);

const EXPECT = {
  place: (t) => ['Place', 'TouristAttraction', 'LakeBodyOfWater', 'School'].includes(t),
  business: (t) => ['LocalBusiness', 'Store', 'Restaurant', 'GasStation'].includes(t),
  service: (t) => t === 'Service',
  news: (t) => t === 'NewsArticle',
  blog: (t) => t === 'BlogPosting',
  photo: (t) => t === 'ImageObject',
};

for (const [kind, url] of Object.entries(urls)) {
  if (!url) continue;
  section(`${kind[0].toUpperCase()}${kind.slice(1)} page — ${url.replace(WEB, '')}`);
  const res = await open(page, url);
  check(res.status() === 200, 'responds 200', String(res.status()));
  m = await meta(page);
  check(m.h1.length === 1 && m.h1[0].length > 0, 'exactly one h1', JSON.stringify(m.h1));
  check(m.canonical === url, 'canonical is the page’s own absolute URL', m.canonical);
  check(m.ogUrl === url && Boolean(m.ogTitle), 'Open Graph title and URL', `${m.ogTitle} ${m.ogUrl}`);
  check(m.description && m.description.length >= 30 && m.description.length <= 160, 'meta description present and ≤160 chars', String(m.description?.length));
  check(!m.robots || !/noindex/.test(m.robots), 'indexable', m.robots);
  check(/ · Udhwa$|Udhwa/.test(m.title), 'title carries the site name', m.title);
  const ld = await jsonLd(page);
  const main = ld.find((d) => d['@type'] !== 'BreadcrumbList');
  check(main && EXPECT[kind](main['@type']), `JSON-LD type fits (${main?.['@type']})`);
  const crumbs = ld.find((d) => d['@type'] === 'BreadcrumbList');
  const lastCrumb = crumbs?.itemListElement?.at(-1);
  check(lastCrumb?.item === url, 'BreadcrumbList ends at this page', lastCrumb?.item);
  check((await page.locator('nav[aria-label="Breadcrumb"] [aria-current="page"]').count()) === 1, 'visible breadcrumb marks the current page');
  if (kind !== 'photo') check(Boolean(m.ogImage) || !main.image, 'og:image present when the page has an image', m.ogImage);

  if (kind === 'place' || kind === 'business' || kind === 'service') {
    const slug = url.split('/').pop();
    const api = await (await fetch(`${API}/v1/${kind === 'business' ? 'businesses' : kind + 's'}/${slug}`)).json();
    const area = api.area;
    if (kind === 'service') {
      const served = main.areaServed?.name ?? '';
      check(!area || served.length > 0, 'areaServed comes from the service or its locality', served);
    } else if (main.address) {
      check(main.address.addressRegion === (area?.region ?? undefined) && main.address.addressCountry === (area?.country ?? undefined) && main.address.addressLocality === (area?.locality ?? undefined),
        'address region/country/locality come from the locality tree', JSON.stringify(main.address));
    }
    const ldText = JSON.stringify(ld);
    check(!/"addressCountry":"IN"/.test(ldText), 'no hard-coded country code');
  }
  if (kind === 'news' || kind === 'blog') {
    check(main.datePublished && main.headline && main.author?.name && main.publisher?.name, 'article has headline, dates, author, publisher');
  }
  if (kind === 'photo') {
    check(main.contentUrl && main.name, 'ImageObject has contentUrl and name');
  }
  check(page.errors.length === 0, 'no browser errors', page.errors.join(' | '));
}

section('Photos gallery and categories');
await open(page, abs('/photos'));
const chips = await page.locator('nav[aria-label="Filter by category"] a').allInnerTexts();
check(chips.length >= 3, 'photo category chips are shown', chips.join(', '));
await page.click('nav[aria-label="Filter by category"] a:has-text("Wildlife")');
await page.waitForURL('**/photos?category=wildlife');
// SEO is judged on a full load (what crawlers fetch), not on the client-side navigation.
await open(page, abs('/photos?category=wildlife'));
m = await meta(page);
check(m.canonical === abs('/photos?category=wildlife') && !/noindex/.test(m.robots ?? ''), 'category view is an indexable page with its own canonical', `${m.canonical} ${m.robots}`);
const wildlife = await page.locator('main a[href^="/photos/"]').count();
const all = (await (await fetch(`${API}/v1/photos`)).json()).total;
check(wildlife > 0 && wildlife < all, 'category filter narrows the gallery', `${wildlife} of ${all}`);
await open(page, abs('/photos?place=udhwa-lake-bird-sanctuary'));
m = await meta(page);
check(/noindex/.test(m.robots ?? ''), 'place-filtered gallery is noindex');
check((await page.locator('h1').innerText()).includes('Photos of'), 'filtered gallery names what it shows');
await open(page, abs('/photos?category=no-such-category'));
check((await page.locator('text=No photos match this filter').count()) === 1, 'empty filter shows a helpful empty state');

section('Noindex rules on private pages');
for (const p of ['/signin', '/contribute/place', '/contribute/correction', '/search?q=x']) {
  await open(page, abs(p));
  m = await meta(page);
  check(/noindex/.test(m.robots ?? ''), `${p} is noindex`, m.robots);
}

section('404s');
for (const p of ['/places/no-such-place', '/businesses/nope', '/services/nope', '/news/nope', '/blogs/nope', '/photos/nope', '/authors/nope', '/totally-unknown', `/news/${draftSlug}`]) {
  const res = await fetch(abs(p), { redirect: 'manual' });
  check(res.status === 404, `${p} → 404`, String(res.status));
}
const nf = await open(page, abs('/places/no-such-place'));
check(nf.status() === 404 && (await page.locator('text=We couldn’t find that page').count()) === 1, '404 page renders with the site header and a search box');
check((await page.locator('header').count()) === 1 && (await page.locator('footer').count()) === 1 && (await page.locator('main').count()) === 1, '404 page inside a section has exactly one header, footer and <main>');

section('Legacy udhwa.in URLs');
const legacy = [
  ['/news/news-2.html', 308, '/news/jac-board-exam-feb-march-2026-teacher-deputation'],
  ['/blogs/blog-1.html', 308, '/blogs/computer-era-mein-skills-ka-mahatva'],
  ['/listings.html', 308, '/businesses'],
  ['/index.html', 308, '/'],
  ['/contribute.html', 308, '/contribute'],
  ['/news/news-1.html', 307, '/news'],
  ['/images/news/jac-exam.jpg', 308, '/seed/jac-exam-hall.jpg'],
];
for (const [from, status, to] of legacy) {
  const res = await fetch(abs(from), { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  check(res.status === status && (loc === to || loc === abs(to)), `${from} → ${status} ${to}`, `${res.status} ${loc}`);
  if (res.status < 400) {
    const target = await fetch(abs(to));
    check(target.status === 200, `  ${to} exists`, String(target.status));
  }
}
for (const gone of ['/downloads.html', '/important-numbers.html', '/emergency-contacts.html', '/404.html']) {
  const res = await fetch(abs(gone), { redirect: 'manual' });
  check(res.status === 404, `${gone} (never had content) → 404`, String(res.status));
}
const adminRedirect = await fetch(abs('/admin/users'), { redirect: 'manual' });
check([307, 308].includes(adminRedirect.status) && adminRedirect.headers.get('location') === `${ADMIN}/users`, '/admin/* on the website redirects to the admin app', adminRedirect.headers.get('location'));

section('Security headers');
const h = (await fetch(abs('/'))).headers;
check(h.get('x-content-type-options') === 'nosniff' && h.get('referrer-policy') && h.get('x-frame-options'), 'website sends security headers');
const apiH = (await fetch(`${API}/v1/home`)).headers;
check(apiH.get('content-security-policy')?.includes("default-src 'none'") && apiH.get('x-content-type-options') === 'nosniff', 'API sends locked-down headers');
const big = await fetch(`${API}/v1/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(3 * 1024 * 1024) }) });
check(big.status === 413, 'API rejects oversized bodies (413)', String(big.status));

await done(browser);
