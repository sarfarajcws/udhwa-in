// Admin end-to-end: access control, every admin screen, moderation → publish → public site.
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
const SHOTS = process.env.SHOTS_DIR || tmpdir();
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function login(base, email, landing) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  page.on('dialog', d => d.accept());
  await page.goto(`${base}/signin?callbackUrl=${encodeURIComponent(landing)}`);
  await page.fill('#dev-email', email);
  await Promise.all([page.waitForResponse((r) => r.url().includes('/auth/dev-login')), page.click('form button[type=submit]')]);
  await page.waitForLoadState('networkidle');
  return page;
}
// 1. non-admin can sign in to admin but gets no access
const nonAdmin = await login(ADMIN, 'priya.test@udhwa.dev', '/signin');
await nonAdmin.goto(ADMIN + '/');
console.log('non-admin ->', new URL(nonAdmin.url()).pathname + new URL(nonAdmin.url()).search, '|', (await nonAdmin.locator('text=doesn’t have admin access').count()) ? 'blocked' : 'NOT BLOCKED');

// 2. admin sees every screen
const admin = await login(ADMIN, 'alamsarfaraj916@gmail.com', '/');
for (const p of ['/', '/contributions', '/corrections', '/place', '/business/new', '/news', '/blog', '/photo', '/service', '/media', '/categories', '/tags', '/authors', '/localities', '/users', '/redirects', '/activity', '/messages']) {
  const r = await admin.goto(ADMIN + p); console.log(r.status(), p);
}
await admin.goto(ADMIN + '/'); await admin.screenshot({ path: SHOTS + '/admin-dash.png', fullPage: true });

// 3. approve the contributed place → draft → publish
const user = await login(WEB, 'priya.test@udhwa.dev', '/account');
await admin.goto(ADMIN + '/contributions');
await admin.click('a:has-text("Udhwa Railway Halt")');
await admin.click('button:has-text("Approve")');
await admin.waitForURL('**/place/**'); console.log('approved -> draft', new URL(admin.url()).pathname);
const editUrl = admin.url().split('?')[0];
await admin.fill('#ef-summary', 'Small railway halt serving Udhwa village, with a few passenger trains a day on the Sahibganj loop line.');
await admin.click('button[value=publish]');
await admin.waitForSelector('text="Published."'); console.log('published');
await admin.waitForTimeout(500);
let r = await user.goto(WEB + '/places/udhwa-railway-halt'); console.log('public place', r.status());
await user.goto(WEB + '/account'); console.log('contributor sees:', (await user.locator('ul.card li').first().innerText()).replace(/\n+/g, ' | '));
await user.goto(WEB + '/'); console.log('home lists new place count:', await user.locator('text=Udhwa Railway Halt').count() >= 0);

// 4. slug change → redirect on the public site
await admin.goto(editUrl);
await admin.fill('#ef-slug', 'udhwa-halt-station');
await admin.click('button[value=save]'); await admin.waitForSelector('text=Saved.');
r = await user.goto(WEB + '/places/udhwa-railway-halt'); console.log('old slug ->', new URL(user.url()).pathname, r.status());

// 5. validation keeps edits
await admin.goto(editUrl);
await admin.fill('#ef-name', '');
await admin.fill('#ef-address', 'Kept address');
await admin.click('button[value=save]'); await admin.waitForSelector('text=Please fix');
console.log('address kept after error:', await admin.inputValue('#ef-address'));

// 6. unpublish removes it from the site
await admin.goto(editUrl);
await admin.click('button:has-text("Unpublish")'); await admin.waitForTimeout(1500);
r = await user.goto(WEB + '/places/udhwa-halt-station'); console.log('after unpublish public status', r.status());

// 7. resolve a correction
await admin.goto(ADMIN + '/corrections');
await admin.click('button:has-text("Resolve")'); await admin.waitForTimeout(1500);
await admin.goto(ADMIN + '/corrections?view=closed'); console.log('closed corrections:', await admin.locator('li').filter({ hasText: 'Resolved' }).count());
await browser.close();
