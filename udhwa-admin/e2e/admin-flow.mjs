// ADMIN flow: access control → Google sign-in → dashboard → review a
// contribution → edit → publish → manage content (service + photo linked to it,
// photo categories) → media (uploads, Tiptap images, usage-aware deletion with
// Cloudinary cleanup) → SEO → users → corrections → slug redirects → unpublish.
// Needs: API, website, admin and udhwa-api's mock providers running (see README).
import { execFileSync } from 'node:child_process';
import {
  ADMIN, ADMIN_EMAIL, API, FIXTURE, WEB, check, done, googleSignIn, jsonLd, launch, meta, mockState, newPage,
  noHorizontalOverflow, open, section, seen, sessionToken, signedInContext,
} from './lib.mjs';

const browser = await launch();
const stamp = Date.now().toString(36);
const userEmail = `e2e.contributor.${stamp}@example.com`;
const userToken = sessionToken(userEmail);
const asUser = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${userToken}`, 'content-type': 'application/json', ...(init.headers ?? {}) } });
const sql = (q) => execFileSync('psql', [process.env.E2E_DATABASE_URL ?? 'postgresql://udhwa:udhwa@localhost:5432/udhwa', '-tAc', q], { encoding: 'utf8' }).trim();

section('Access control');
const userPage = await newPage(await signedInContext(browser, userEmail));
await open(userPage, `${ADMIN}/`);
check(new URL(userPage.url()).pathname === '/signin' && (await seen(userPage, 'doesn’t have admin access')), 'a signed-in non-admin is kept out of the admin app');
check((await asUser('/v1/admin/counts')).status === 403, 'the API refuses admin endpoints for non-admins');
check((await fetch(`${API}/v1/admin/counts`)).status === 401, 'the API refuses admin endpoints without a session');
// A stale ADMIN role in the database (email no longer in ADMIN_EMAILS) grants nothing.
const staleEmail = `e2e.former.admin.${stamp}@example.com`;
const staleToken = sessionToken(staleEmail);
sql(`UPDATE "User" SET role = 'ADMIN' WHERE email = '${staleEmail}'`);
const staleMe = await (await fetch(`${API}/v1/auth/me`, { headers: { authorization: `Bearer ${staleToken}` } })).json();
const staleAdmin = await fetch(`${API}/v1/admin/counts`, { headers: { authorization: `Bearer ${staleToken}` } });
check(staleMe.user.role === 'USER' && staleAdmin.status === 403, 'admin access comes only from ADMIN_EMAILS (stale DB roles are revoked)', `${staleMe.user.role} ${staleAdmin.status}`);
check(sql(`SELECT role FROM "User" WHERE email = '${staleEmail}'`) === 'USER', 'the stored role is corrected too');

section('Admin sign-in with Google');
const admin = await newPage(browser, { width: 1360, height: 900 });
await open(admin, `${ADMIN}/`);
check(new URL(admin.url()).pathname === '/signin', 'admin app requires sign-in');
check((await admin.locator('#dev-email').count()) === 0, 'no development login');
await googleSignIn(admin, ADMIN_EMAIL);
check(new URL(admin.url()).pathname === '/', 'lands on the dashboard after Google sign-in', admin.url());
check(await seen(admin, 'What needs attention'), 'dashboard renders');
const adminCookie = (await admin.context().cookies(ADMIN)).find((c) => c.name === 'udhwa_session');
const asAdmin = (path, init = {}) => fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${adminCookie.value}`, 'content-type': 'application/json', ...(init.headers ?? {}) } });

section('Every admin screen loads');
for (const p of ['/', '/contributions', '/corrections', '/messages', '/place', '/business', '/service', '/news', '/blog', '/photo', '/media', '/seo', '/categories', '/tags', '/authors', '/localities', '/users', '/redirects', '/activity', '/place/new', '/photo/new']) {
  const r = await admin.goto(`${ADMIN}${p}`);
  check(r.status() === 200 && admin.errors.length === 0, `${p}`, `${r.status()} ${admin.errors.join(' | ')}`);
}
await admin.goto(`${ADMIN}/place/doesnotexist000000000000`);
// (Streaming behind loading.tsx means the status line is already sent; the content is what matters in a noindex app.)
check((await seen(admin, 'This item doesn’t exist')) && (await admin.locator('nav[aria-label="Admin"]').count()) > 0, 'unknown item shows the admin 404 inside the shell');

section('Review a contribution → edit → publish');
const placeName = `E2E Halt Station ${stamp}`;
const sub = await (await asUser('/v1/contributions/place', { method: 'POST', body: JSON.stringify({ name: placeName, summary: 'A small halt station on the loop line, near the village.', categorySlug: 'transport' }) })).json();
check(Boolean(sub.id), 'contributor submits a place');
await open(admin, `${ADMIN}/contributions`);
await admin.click(`a:has-text("${placeName}")`);
await admin.waitForLoadState('networkidle');
await admin.click('button[value=approve]');
await admin.waitForURL('**/place/**');
await admin.waitForLoadState('networkidle');
check(new URL(admin.url()).pathname.startsWith('/place/'), 'approval creates a draft place and opens it');
const placeEditUrl = admin.url().split('?')[0];
await admin.fill('#ef-summary', 'A small halt station on the Sahibganj loop line, about two kilometres from the village centre.');
await admin.fill('#ef-address', 'Udhwa Halt, Sahibganj loop line');
await admin.click('button[value=publish]');
check(await seen(admin, 'Published.'), 'edited and published');
const placeSlug = await admin.inputValue('#ef-slug');
let res = await fetch(`${WEB}/places/${placeSlug}`);
check(res.status === 200, 'published place is live on the website', String(res.status));
const mine = await (await asUser(`/v1/me/contributions/${sub.id}`)).json();
check(mine.contribution.status === 'PUBLISHED' && mine.liveHref === `/places/${placeSlug}`, 'contributor sees “Published” with a link', JSON.stringify([mine.contribution.status, mine.liveHref]));

section('SEO fields → public page');
await open(admin, placeEditUrl);
await admin.click('summary:has-text("SEO")');
await admin.fill('#ef-seoTitle', `Halt station ${stamp} near Udhwa`);
await admin.fill('#ef-seoDescription', 'Train timings, location and how to reach the small halt station on the Sahibganj loop line near Udhwa village.');
await admin.click('button[value=save]');
check(await seen(admin, 'Saved.'), 'SEO fields saved');
const pub = await newPage(browser);
await open(pub, `${WEB}/places/${placeSlug}`);
let m = await meta(pub);
check(m.title.startsWith(`Halt station ${stamp} near Udhwa`) && m.description.startsWith('Train timings'), 'public page uses the SEO title and description', `${m.title} | ${m.description}`);
await open(admin, `${ADMIN}/seo`);
check(await seen(admin, 'Published items checked'), 'SEO health report renders');
check(await seen(admin, placeName), 'the new place is flagged (no image yet)');

section('Slug change → permanent redirect; unpublish → 404');
await open(admin, placeEditUrl);
await admin.fill('#ef-slug', `${placeSlug}-renamed`);
await admin.click('button[value=save]');
await seen(admin, 'Saved.');
res = await fetch(`${WEB}/places/${placeSlug}`, { redirect: 'manual' });
check(res.status === 308 && res.headers.get('location')?.endsWith(`/places/${placeSlug}-renamed`), 'old URL 308-redirects to the new slug', `${res.status} ${res.headers.get('location')}`);
await open(admin, placeEditUrl);
await admin.click('button:has-text("Unpublish")');
await admin.waitForLoadState('networkidle');
res = await fetch(`${WEB}/places/${placeSlug}-renamed`);
check(res.status === 404, 'unpublished content 404s', String(res.status));

section('Service with photos (Service ↔ Photo)');
await open(admin, `${ADMIN}/service/new`);
const serviceName = `E2E Bicycle Repair ${stamp}`;
await admin.fill('#ef-name', serviceName);
await admin.fill('#ef-summary', 'Puncture repair, chain and brake fixes for bicycles, near the market.');
await admin.fill('#ef-providerName', 'Ramesh Cycle Works');
await admin.click('button[value=publish]');
await admin.waitForURL('**/service/**');
check(await seen(admin, 'Published.') || (await admin.url()).includes('created=1'), 'service created and published');
const serviceId = new URL(admin.url()).pathname.split('/').pop();
const serviceSlug = await admin.inputValue('#ef-slug');

await open(admin, `${ADMIN}/photo/new`);
await admin.setInputFiles('input[type=file]', FIXTURE('kohinoor-restaurant-night.jpg'));
await admin.waitForFunction(() => document.querySelector('input[name=mediaId]')?.value, null, { timeout: 20000 });
const photoMediaId = await admin.inputValue('input[name=mediaId]');
const photoPublicId = (await mockState()).assets.at(-1);
check(photoPublicId?.startsWith('udhwa/library/'), 'admin uploads go to the library folder', photoPublicId);
await admin.fill('#ef-title', `Repair stall ${stamp}`);
await admin.fill('#ef-caption', 'The stall on market road in the evening.');
await admin.selectOption('#ef-categoryId', { label: 'Community' });
await admin.selectOption('#ef-serviceId', { value: serviceId });
await admin.click('button[value=publish]');
await admin.waitForURL('**/photo/**');
check(await seen(admin, 'Published.') || admin.url().includes('created=1'), 'photo created with a category and linked to the service');
const photoEditUrl = admin.url().split('?')[0];
const photoId = new URL(photoEditUrl).pathname.split('/').pop();
await open(pub, `${WEB}/services/${serviceSlug}`);
check(await pub.locator(`a[href="/photos/${photoId}"]`).count() === 1, 'service page shows its photo');
await open(pub, `${WEB}/photos/${photoId}`);
check(await pub.locator(`a[href="/services/${serviceSlug}"]`).count() === 1, 'photo page links back to the service');
const crumbs = (await jsonLd(pub)).find((d) => d['@type'] === 'BreadcrumbList');
check(crumbs.itemListElement.some((i) => i.name === 'Community'), 'photo breadcrumb includes its gallery category');
await open(pub, `${WEB}/photos?category=community`);
check(await pub.locator(`a[href="/photos/${photoId}"]`).count() === 1, 'photo appears in its gallery category');
await open(pub, `${WEB}/photos?service=${serviceSlug}`);
check(await pub.locator(`a[href="/photos/${photoId}"]`).count() === 1 && (await pub.locator('h1').innerText()).includes(serviceName), 'service photo gallery view');

section('Tiptap image in an article → media usage → safe deletion');
await open(admin, `${ADMIN}/news/new`);
const newsTitle = `E2E: new footbridge over the canal ${stamp}`;
await admin.fill('#ef-title', newsTitle);
await admin.fill('#ef-excerpt', 'The panchayat has opened a footbridge over the irrigation canal near the school.');
await admin.locator('.tiptap').first().click();
await admin.keyboard.type('The bridge shortens the walk to school by ten minutes for children from the east side.');
await admin.setInputFiles('[role=toolbar] input[type=file]', FIXTURE('udhwa-lake-hyacinth.jpg'));
await admin.waitForSelector('.tiptap img', { timeout: 20000 });
const inlinePublicId = (await mockState()).assets.at(-1);
const doc = JSON.parse(await admin.inputValue('input[name=content]'));
const inlineMediaId = doc.content.find((n) => n.type === 'image')?.attrs?.mediaId;
check(Boolean(inlineMediaId), 'editor stores the image’s Media id');
await admin.click('button[value=publish]');
await admin.waitForURL('**/news/**');
check(await seen(admin, 'Published.') || admin.url().includes('created=1'), 'article with an inline image published');
const newsEditUrl = admin.url().split('?')[0];
const usage = await (await asAdmin(`/v1/admin/media/${inlineMediaId}/usage`)).json();
check(usage.uses?.some((u) => u.kind.startsWith('In news text')), 'media usage records the article', JSON.stringify(usage));
let del = await asAdmin(`/v1/admin/media/${inlineMediaId}`, { method: 'DELETE' });
let delBody = await del.json();
check(del.status === 409 && /still used/.test(delBody.error) && /news/.test(delBody.error), 'deleting an image used in an article is refused, with where it is used', `${del.status} ${delBody.error}`);
check(!(await mockState()).destroyed.includes(inlinePublicId), 'Cloudinary asset untouched');
await open(admin, `${ADMIN}/media?unused=1`);
check((await admin.locator(`img[src*="${inlinePublicId.split('/').pop()}"]`).count()) === 0, '“Unused only” filter excludes it');
// Remove the image from the article, then deletion goes through.
await open(admin, newsEditUrl);
await admin.locator('.tiptap img').click();
await admin.keyboard.press('Delete');
await admin.waitForFunction(() => !JSON.parse(document.querySelector('input[name=content]').value).content.some((n) => n.type === 'image'));
await admin.click('button[value=save]');
check(await seen(admin, 'Saved.'), 'article saved without the image');
del = await asAdmin(`/v1/admin/media/${inlineMediaId}`, { method: 'DELETE' });
check(del.status === 200, 'now the image can be deleted', String(del.status));
check((await mockState()).destroyed.includes(inlinePublicId), 'and its Cloudinary asset is destroyed');
check(sql(`SELECT count(*) FROM "Media" WHERE id = '${inlineMediaId}'`) === '0', 'and its database record is gone');

section('Photo deletion cleans up its media');
del = await asAdmin(`/v1/admin/media/${photoMediaId}`, { method: 'DELETE' });
check(del.status === 409, 'a photo’s image can’t be deleted from the library while the photo exists', String(del.status));
await open(admin, photoEditUrl);
await admin.click('button:has-text("Delete")');
await admin.waitForURL('**/photo?deleted=1');
check(sql(`SELECT count(*) FROM "Media" WHERE id = '${photoMediaId}'`) === '0', 'deleting the photo removes its media record');
check((await mockState()).destroyed.includes(photoPublicId), 'and destroys the Cloudinary asset');
res = await fetch(`${WEB}/photos/${photoId}`);
check(res.status === 404, 'deleted photo 404s on the website', String(res.status));

section('Media library: upload, unused filter, delete');
await open(admin, `${ADMIN}/media`);
await admin.setInputFiles('input[type=file]', FIXTURE('phone-coding.jpg'));
await admin.waitForTimeout(500);
await admin.waitForLoadState('networkidle');
const libPublicId = (await mockState()).assets.at(-1);
await open(admin, `${ADMIN}/media?unused=1`);
const card = admin.locator('li', { has: admin.locator(`img[src*="${libPublicId.split('/').pop()}"]`) });
check((await card.count()) === 1, 'new upload shows under “Unused only”');
await card.locator('button:has-text("Delete")').click();
await admin.waitForLoadState('networkidle');
await admin.waitForTimeout(500);
check((await mockState()).destroyed.includes(libPublicId), 'deleting an unused image removes it from Cloudinary');

section('Structured data follows locality data');
const jh = sql(`SELECT id FROM "Locality" WHERE slug = 'jharkhand'`);
await asAdmin(`/v1/admin/localities/${jh}`, { method: 'PUT', body: JSON.stringify({ name: 'Jharkhand State', slug: 'jharkhand', kind: 'STATE', parentId: sql(`SELECT id FROM "Locality" WHERE slug = 'india'`) }) });
await open(pub, `${WEB}/businesses/kohinoor-restaurant`);
let biz = (await jsonLd(pub)).find((d) => d.address);
check(biz?.address?.addressRegion === 'Jharkhand State' && biz.address.addressCountry === 'India', 'renaming a locality changes the address in JSON-LD', JSON.stringify(biz?.address));
await asAdmin(`/v1/admin/localities/${jh}`, { method: 'PUT', body: JSON.stringify({ name: 'Jharkhand', slug: 'jharkhand', kind: 'STATE', parentId: sql(`SELECT id FROM "Locality" WHERE slug = 'india'`) }) });
const loop = await asAdmin(`/v1/admin/localities/${sql(`SELECT id FROM "Locality" WHERE slug = 'india'`)}`, { method: 'PUT', body: JSON.stringify({ name: 'India', slug: 'india', kind: 'COUNTRY', parentId: jh }) });
check(loop.status === 422, 'locality loops are refused', String(loop.status));

section('Users');
await open(admin, `${ADMIN}/users?q=${encodeURIComponent(userEmail)}`);
check((await admin.locator('text=Make admin').count()) === 0 && (await seen(admin, 'ADMIN_EMAILS')), 'no client-side role management; admin access is explained');
await admin.click('button:has-text("Suspend")');
await admin.waitForLoadState('networkidle');
await seen(admin, 'Suspended');
const suspended = await (await fetch(`${API}/v1/auth/me`, { headers: { authorization: `Bearer ${userToken}` } })).json();
check(suspended.user === null, 'suspending signs the user out everywhere');
const subAfter = await asUser('/v1/contributions/place', { method: 'POST', body: JSON.stringify({ name: 'Should fail', summary: 'Suspended users cannot contribute anything.' }) });
check(subAfter.status === 401, 'suspended users can’t contribute', String(subAfter.status));
await admin.click('button:has-text("Reactivate")');
await admin.waitForLoadState('networkidle');
check(sql(`SELECT status FROM "User" WHERE email = '${userEmail}'`) === 'ACTIVE', 'reactivated');

section('Corrections');
const target = sql(`SELECT id FROM "Business" WHERE slug = 'haya-mart'`);
const corrUserToken = sessionToken(`e2e.corrector.${stamp}@example.com`);
const corr = await (await fetch(`${API}/v1/corrections`, { method: 'POST', headers: { authorization: `Bearer ${corrUserToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ target: 'business', id: target, message: 'Opening hours on the board have changed to 9am–9pm.' }) })).json();
await open(admin, `${ADMIN}/corrections?focus=${corr.id}`);
const item = admin.locator(`li[id="${corr.id}"]`);
check((await item.count()) === 1, 'new correction is in the open queue');
await item.locator('button:has-text("Resolve"), button:has-text("Mark resolved")').first().click();
await admin.waitForLoadState('networkidle');
check(sql(`SELECT status FROM "Correction" WHERE id = '${corr.id}'`) === 'RESOLVED', 'correction resolved');

section('Admin on a phone');
const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await phoneCtx.addCookies([{ name: 'udhwa_session', value: adminCookie.value, url: ADMIN }]);
const phone = await newPage(phoneCtx);
const bad = [];
for (const p of ['/', '/contributions', '/place', '/media', '/seo', '/users', '/categories', '/authors', '/localities', placeEditUrl.replace(ADMIN, '')]) {
  await open(phone, `${ADMIN}${p}`);
  if (!(await noHorizontalOverflow(phone))) bad.push(p);
}
check(bad.length === 0, 'admin screens don’t scroll sideways at 390px', bad.join(', '));
await phone.click('button[aria-label="Open admin menu"]');
check(await phone.locator('nav[aria-label="Admin"] a:has-text("SEO health")').last().isVisible(), 'admin mobile menu opens with every section');

check(admin.errors.length === 0, 'no uncaught browser errors in the admin', admin.errors.join(' | '));
await done(browser);
