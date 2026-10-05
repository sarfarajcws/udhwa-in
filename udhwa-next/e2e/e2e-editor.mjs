import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
const SHOTS = process.env.SHOTS_DIR || tmpdir();
const B = process.env.WEB_URL ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
async function login(email, w = 1360, base = B) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', String(e)));
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'https://example.org/source' : undefined));
  await page.goto(base + '/signin?callbackUrl=' + encodeURIComponent(base === B ? '/account' : '/'));
  await page.fill('#dev-email', email);
  await Promise.all([page.waitForResponse((r) => r.url().includes('/auth/dev-login')), page.click('form button[type=submit]')]);
  await page.waitForLoadState('networkidle');
  return page;
}
// user writes a blog with the editor (mobile width)
const u = await login('meena.writer@udhwa.dev', 390);
await u.goto(B + '/contribute/blog');
await u.fill('#f-title', 'A sunrise walk at Berhale Lake');
await u.fill('#f-excerpt', 'What you see, hear and smell on a slow winter morning at the quieter of Udhwa’s two lakes.');
const ed = u.locator('.tiptap').first();
await ed.click(); await u.keyboard.type('Start at the east bank just after sunrise. ');
await u.keyboard.press('Control+b'); await u.keyboard.type('Bring binoculars.'); await u.keyboard.press('Control+b');
await u.keyboard.press('Enter'); await u.click('button[aria-label="Heading"]'); await u.keyboard.type('What to look for');
await u.keyboard.press('Enter'); await u.click('button[aria-label="Bulleted list"]'); await u.keyboard.type('Purple swamphens'); await u.keyboard.press('Enter'); await u.keyboard.type('Openbill storks');
await u.screenshot({ path: SHOTS + '/blog-form-mobile.png', fullPage: true });
await u.click('button:has-text("Send for review")');
await u.waitForURL('**/account/contributions/**'); console.log('blog submitted');

// admin approves → draft blog → publish
const a = await login('alamsarfaraj916@gmail.com', 1360, ADMIN);
await a.goto(ADMIN + '/contributions'); await a.click('a:has-text("A sunrise walk")');
await a.click('button:has-text("Approve")'); await a.waitForURL('**/blog/**');
await a.fill('#ef-tags', 'Udhwa Lake, Birds, Walks');
await a.click('button[value=publish]'); await a.waitForSelector('text="Published."');
const r = await u.goto(B + '/blogs/a-sunrise-walk-at-berhale-lake'); console.log('public blog', r.status());
console.log('rendered:', (await u.locator('article .prose-udhwa').innerText()).replace(/\n+/g,' | ').slice(0,160));
console.log('author byline:', await u.locator('text=Written by').count() ? await u.locator('article ~ div p.font-semibold').first().innerText() : 'none');

// admin creates news from scratch
await a.goto(ADMIN + '/news/new');
await a.fill('#ef-title', 'Bar-headed geese spotted at Udhwa Lake');
await a.fill('#ef-excerpt', 'Forest staff report the first bar-headed geese of the season, about two weeks earlier than last year.');
await a.locator('.tiptap').first().click(); await a.keyboard.type('Forest guards counted around forty bar-headed geese on Berhale Lake on Saturday morning.');
await a.fill('#ef-sourceName', 'Jharkhand Forest Department, Udhwa range');
await a.fill('#ef-tags', 'Birds, Udhwa Lake');
await a.selectOption('#ef-placeId', { label: 'Berhale Lake' });
await a.click('button[value=save]'); await a.waitForURL('**/news/**?created=1'); console.log('news draft created');
const draftUrl = a.url().split('?')[0];
let pub = await u.goto(B + '/news/bar-headed-geese-spotted-at-udhwa-lake'); console.log('draft public status', pub.status());
await a.goto(draftUrl); await a.click('button[value=publish]'); await a.waitForSelector('text="Published."');
pub = await u.goto(B + '/news/bar-headed-geese-spotted-at-udhwa-lake'); console.log('published public status', pub.status());
await u.goto(B + '/places/berhale-lake'); console.log('berhale shows news:', await u.locator('text=Bar-headed geese spotted').count() > 0);
await u.goto(B + '/search?q=geese'); console.log('search finds:', await u.locator('main li h2').allInnerTexts());
await a.goto(ADMIN + '/'); await a.setViewportSize({ width: 390, height: 800 }); await a.screenshot({ path: SHOTS + '/admin-mobile.png' });
await browser.close();
