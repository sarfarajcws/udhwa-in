import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
const SHOTS = process.env.SHOTS_DIR || tmpdir();
const B = process.env.WEB_URL ?? 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(String(e)));
// unauthenticated -> redirected to signin
await page.goto(B + '/contribute/place'); console.log('unauth ->', new URL(page.url()).pathname);
await page.fill('#dev-email', 'priya.test@udhwa.dev'); await page.click('form button[type=submit]');
await page.waitForURL('**/contribute/place', { timeout: 15000 }); console.log('after login ->', new URL(page.url()).pathname);
// submit with validation error first
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForSelector('p[role=alert]'); console.log('validation:', (await page.locator('p[role=alert]').first().innerText()).slice(0,80));
await page.fill('#f-address', 'kept?'); 
await page.fill('#f-name', 'Udhwa Railway Halt');
await page.fill('#f-summary', 'Small halt station near Udhwa village on the loop line.');
await page.selectOption('#f-categorySlug', 'transport');
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForURL('**/account/contributions/**'); console.log('submitted ->', new URL(page.url()).pathname);
console.log('status:', await page.locator('text=Submitted').first().innerText());
await page.screenshot({ path: SHOTS + '/contrib.png', fullPage: true });
// correction
await page.goto(B + '/businesses/haya-mart');
await page.click('text=Suggest a correction');
await page.waitForURL('**/contribute/correction**');
await page.fill('#k-message', 'The phone number has an extra digit on the board outside.');
await page.click('button:has-text("Send to the Udhwa team")');
await page.waitForSelector('text=Thank you'); console.log('correction ok');
await page.goto(B + '/account'); console.log('account items:', await page.locator('ul.card li').count());
await page.screenshot({ path: SHOTS + '/account.png', fullPage: true });
console.log('errors:', errs);
await browser.close();
