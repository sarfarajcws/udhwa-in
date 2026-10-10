// Unknown URLs must return the branded 404 (HTTP 404, one header/footer/main) — never a 500 —
// while valid pages and legacy .html redirects keep working.
// Runs against a production build (dev mode hides the static→dynamic error), with a stub API:
//   npm run build && node e2e/not-found.mjs
import { spawn } from 'node:child_process';
import http from 'node:http';
import { chromium } from 'playwright';

const API_PORT = 4100, WEB_PORT = 3100, WEB = `http://localhost:${WEB_PORT}`;
const REDIRECTS = { '/news/news-2.html': '/news/some-article', '/blogs/blog-1.html': '/blogs/some-post', '/news.html': '/news' };

const api = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  res.setHeader('content-type', 'application/json');
  if (u.pathname === '/v1/redirects/resolve') {
    const to = REDIRECTS[u.searchParams.get('path')];
    return res.end(JSON.stringify({ redirect: to ? { toPath: to, permanent: true } : null }));
  }
  if (u.pathname === '/v1/auth/me') return res.end(JSON.stringify({ user: null }));
  if (u.pathname === '/v1/site') return res.end(JSON.stringify({ locality: null }));
  if (process.env.DEBUG_STUB) console.log('STUB 404', req.url);
  res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found', code: 'not_found' }));
}).listen(API_PORT);

const web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(WEB_PORT)], { env: { ...process.env, API_URL: `http://localhost:${API_PORT}` }, stdio: ['ignore', 'pipe', 'pipe'], detached: true }); // own process group: `next start` forks next-server
let log = ''; web.stdout.on('data', (d) => (log += d)); web.stderr.on('data', (d) => (log += d));
for (let i = 0; i < 60 && !(await fetch(WEB).then(() => true, () => false)); i++) await new Promise((r) => setTimeout(r, 500));

let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  ${extra}`}`); if (!ok) failed++; };

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
try {
  const unknown = ['/zzz', '/news/zzz', '/blogs/zzz', '/businesses/sss', '/places/zzz', '/services/zzz', '/blogs/blog-9.html', '/downloads.html'];
  for (const p of unknown) {
    const res = await page.goto(WEB + p, { waitUntil: 'networkidle' });
    const counts = [await page.locator('header').count(), await page.locator('footer').count(), await page.locator('main').count()];
    check(res.status() === 404, `${p} → HTTP 404`, String(res.status()));
    check(counts.join() === '1,1,1', `${p} has exactly one header/footer/main`, counts.join());
    check((await page.locator('h1').innerText()) === 'We couldn’t find that page', `${p} shows the branded 404`);
  }
  for (const [from, to] of Object.entries(REDIRECTS)) {
    const res = await fetch(WEB + from, { redirect: 'manual' });
    check(res.status === 308 && new URL(res.headers.get('location') ?? '', WEB).pathname === to, `${from} → 308 ${to}`, `${res.status} ${res.headers.get('location')}`);
  }
  const ok = await fetch(WEB + '/contact');
  check(ok.status === 200, '/contact (valid page) → 200', String(ok.status));
  check(!/static to dynamic/.test(log), 'no "Page changed from static to dynamic" errors in the server log', log); // the stub API is minimal, so other 404s from it are expected
} finally {
  await browser.close(); try { process.kill(-web.pid); } catch {} api.close();
}
process.exit(failed ? 1 : 0);
