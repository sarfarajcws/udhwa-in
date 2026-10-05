// Mobile navigation + responsive layouts: the menu works on phones, and no
// page scrolls sideways at common widths (signed out and signed in).
import { WEB, check, done, launch, noHorizontalOverflow, open, section, sessionToken } from './lib.mjs';

const browser = await launch();

section('Mobile navigation (390×800, touch)');
const mctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
const page = await mctx.newPage();
await open(page, `${WEB}/news`);
await page.click('button[aria-label="Open menu"]');
const panel = page.locator('#mobile-nav');
const box = await panel.boundingBox();
check(box && box.height > 500 && box.width >= 300, 'menu panel opens full height', JSON.stringify(box));
check(await page.evaluate(() => document.body.style.overflow === 'hidden'), 'page scroll is locked while open');
const links = await page.locator('#mobile-nav a').allInnerTexts();
check(['Places', 'Businesses', 'Services', 'News', 'Blogs', 'Photos'].every((l) => links.some((x) => x.includes(l))), 'all sections are in the menu', links.join(', '));
await page.locator('#mobile-nav a', { hasText: 'Businesses' }).tap();
await page.waitForURL('**/businesses');
check((await panel.count()) === 0 && (await page.evaluate(() => document.body.style.overflow === '')), 'navigating closes the menu and restores scrolling');
await page.click('button[aria-label="Open menu"]');
await page.keyboard.press('Escape');
check((await panel.count()) === 0, 'Escape closes the menu');

section('No horizontal overflow');
const sitemap = await (await fetch(`${WEB}/sitemap.xml`)).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(WEB, ''));
const pick = (p) => locs.find((l) => l.startsWith(p) && l.length > p.length);
const publicPages = ['/', '/places', '/businesses', '/services', '/news', '/blogs', '/photos', '/about', '/contact', '/contribute', '/search?q=lake', '/signin',
  pick('/places/'), pick('/businesses/'), pick('/services/'), pick('/news/'), pick('/blogs/'), pick('/photos/'), pick('/authors/'), '/no-such-page'].filter(Boolean);
for (const width of [360, 390, 768, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  const bad = [];
  for (const path of publicPages) {
    await open(p, `${WEB}${path}`);
    if (!(await noHorizontalOverflow(p))) bad.push(path);
  }
  check(bad.length === 0, `public pages fit at ${width}px`, bad.join(', '));
  await ctx.close();
}
const token = sessionToken('e2e.responsive@example.com');
for (const width of [360, 390]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  await ctx.addCookies([{ name: 'udhwa_session', value: token, url: WEB }]);
  const p = await ctx.newPage();
  const bad = [];
  for (const path of ['/account', '/contribute/place', '/contribute/business', '/contribute/service', '/contribute/photo', '/contribute/news', '/contribute/blog', `/contribute/correction?target=business&id=x`]) {
    await open(p, `${WEB}${path}`);
    if (!(await noHorizontalOverflow(p))) bad.push(path);
  }
  check(bad.length === 0, `signed-in pages fit at ${width}px`, bad.join(', '));
  await ctx.close();
}

await done(browser);
