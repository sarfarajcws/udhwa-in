// Shared helpers for the browser end-to-end suites (Playwright, no test runner).
// Each suite exits non-zero on the first failed check.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const WEB = (process.env.WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const ADMIN = (process.env.ADMIN_URL ?? 'http://localhost:3001').replace(/\/$/, '');
export const API = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
export const MOCK = (process.env.MOCK_PROVIDERS_URL ?? 'http://localhost:4100').replace(/\/$/, '');
export const SHOTS = process.env.SHOTS_DIR || tmpdir();
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const API_DIR = process.env.UDHWA_API_DIR || path.resolve(HERE, '../../udhwa-api');
/** An admin account: E2E_ADMIN_EMAIL, else the first ADMIN_EMAILS entry in udhwa-api/.env. */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? (() => {
  try {
    const line = readFileSync(path.join(API_DIR, '.env'), 'utf8').split('\n').find((l) => l.startsWith('ADMIN_EMAILS='));
    return line?.split('=')[1].replace(/"/g, '').split(',')[0].trim();
  } catch {
    return undefined;
  }
})();
/** Real images to upload (bundled seed photos). */
export const FIXTURE = (name) => path.resolve(HERE, '../public/seed', name);

let failures = 0;
export function check(cond, label, detail = '') {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return Boolean(cond);
}
export const section = (t) => console.log(`\n${t}`);
export function done(browser) {
  return browser.close().then(() => {
    console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
    process.exit(failures ? 1 : 0);
  });
}

export async function launch() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  // Mock uploads point at res.cloudinary.com URLs that don't exist: fail them fast
  // instead of letting them hang (they'd keep pages from ever going idle).
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (opts) => {
    const ctx = await newContext(opts);
    if (process.env.E2E_REAL_CLOUDINARY !== 'true') await ctx.route('https://res.cloudinary.com/**', (r) => r.abort());
    return ctx;
  };
  return browser;
}

/** A page that records uncaught errors and failed same-site requests. */
export async function newPage(ctxOrBrowser, viewport = { width: 1280, height: 900 }) {
  const ctx = 'newContext' in ctxOrBrowser ? await ctxOrBrowser.newContext({ viewport }) : ctxOrBrowser;
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  page.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'A test image description' : undefined));
  return page;
}

/**
 * Signs a browser context in without the Google round trip: a session is
 * minted directly in the (local) database by udhwa-api's test helper.
 * The real Google flow is covered separately against the mock provider.
 */
export function sessionToken(email) {
  return execFileSync('npm', ['run', '-s', 'test:session', '--', email], { cwd: API_DIR, encoding: 'utf8' }).trim();
}
export async function signedInContext(browser, email, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const token = sessionToken(email);
  for (const base of [WEB, ADMIN]) {
    await ctx.addCookies([{ name: 'udhwa_session', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  }
  return ctx;
}

/** Navigates and waits until the page is hydrated and idle (forms are interactive). */
export async function open(page, url) {
  const res = await page.goto(url);
  await page.waitForLoadState('networkidle');
  return res;
}

/** Waits for visible text; returns false (instead of throwing) when it doesn't appear. */
export async function seen(page, text, timeout = 15000) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/** Completes "Continue with Google" against the mock provider's account chooser. */
export async function googleSignIn(page, email) {
  await page.click('a:has-text("Continue with Google")');
  await page.waitForURL(`${MOCK}/google/auth**`);
  await page.fill('#mock-google-email', email);
  await Promise.all([page.waitForURL((u) => !u.href.startsWith(MOCK)), page.click('#mock-google-continue')]);
  await page.waitForLoadState('networkidle');
}

export async function mockState() {
  return (await fetch(`${MOCK}/__state`)).json();
}

/** Parsed JSON-LD blocks on the current page. */
export async function jsonLd(page) {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  return raw.flatMap((t) => {
    const v = JSON.parse(t);
    return Array.isArray(v) ? v : [v];
  });
}

export async function meta(page) {
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') ?? null,
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()),
  }));
}

/** True when the page doesn't scroll sideways at the current viewport. */
export async function noHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

/** Reads a JSON API endpoint as the given context's user (through the site's proxy). */
export async function apiAs(page, base, apiPath, init = {}) {
  return page.evaluate(
    async ([url, init]) => {
      const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } });
      return { status: r.status, body: await r.json().catch(() => null) };
    },
    [`${base}/api${apiPath}`, init],
  );
}
