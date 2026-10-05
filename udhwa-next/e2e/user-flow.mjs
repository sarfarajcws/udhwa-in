// USER flow: Google sign-in → profile → contributions (incl. photo upload and a
// blog with an inline image) → submission status → withdraw → correction.
// Needs: API + website running, udhwa-api's mock providers on :4100 (see README).
import { ADMIN, API, FIXTURE, WEB, check, done, googleSignIn, launch, mockState, newPage, open, section, seen, signedInContext } from './lib.mjs';

const browser = await launch();
const stamp = Date.now().toString(36);
const email = `e2e.user.${stamp}@example.com`;

section('Google sign-in (real OAuth code flow against the mock provider)');
const page = await newPage(browser);
await open(page, `${WEB}/contribute/place`);
check(new URL(page.url()).pathname === '/signin', 'contributing requires sign-in', page.url());
check((await page.locator('#dev-email').count()) === 0 && (await page.locator('text=Development login').count()) === 0, 'no development login on the sign-in page');
// The authorize request carries PKCE, state and nonce and the front-end's own callback.
const [authReq] = await Promise.all([page.waitForRequest((q) => q.url().includes('/google/auth')), page.click('a:has-text("Continue with Google")')]);
const au = new URL(authReq.url());
check(au.searchParams.get('redirect_uri') === `${WEB}/api/v1/auth/google/callback`, 'redirect URI is the website’s own callback', au.searchParams.get('redirect_uri'));
check(au.searchParams.get('code_challenge_method') === 'S256' && au.searchParams.get('state') && au.searchParams.get('nonce'), 'PKCE (S256), state and nonce are sent');
// Cancelling at Google returns a readable error.
await page.click('#mock-google-cancel');
await page.waitForURL(`${WEB}/signin**`);
check(new URL(page.url()).searchParams.get('error') === 'AccessDenied' && (await page.locator('text=cancelled or denied').count()) > 0, 'cancelling at Google shows an error');
// A forged callback (no matching state cookie) is rejected.
await open(page, `${WEB}/api/v1/auth/google/callback?code=forged&state=forged`);
check(new URL(page.url()).searchParams.get('error') === 'OAuthState', 'callback with an unknown state is rejected');
// Now sign in for real.
await open(page, `${WEB}/signin?callbackUrl=${encodeURIComponent('/contribute/place')}`);
await googleSignIn(page, email);
check(new URL(page.url()).pathname === '/contribute/place', 'returns to the page that asked for sign-in', page.url());
const cookies = await page.context().cookies(WEB);
const session = cookies.find((c) => c.name === 'udhwa_session');
check(session?.httpOnly && session.sameSite === 'Lax', 'session cookie is first-party, httpOnly, SameSite=Lax');
const me = await page.evaluate(() => fetch('/api/v1/auth/me').then((x) => x.json()));
check(me.user?.email === email && me.user.role === 'USER', 'signed in as a regular user', JSON.stringify(me.user));

section('Profile');
await open(page, `${WEB}/account`);
await page.fill('#p-name', 'E2E Contributor');
await page.fill('#p-username', `e2e-${stamp}`);
await page.fill('#p-bio', 'Testing Udhwa end to end.');
await page.click('form:has(#p-name) button[type=submit]');
await page.waitForSelector('text=Profile saved');
await page.reload();
check((await page.inputValue('#p-name')) === 'E2E Contributor', 'profile changes are saved');

section('Place contribution → submission status');
await open(page, `${WEB}/contribute/place`);
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForSelector('p[role=alert]');
check((await page.locator('p[role=alert]').first().innerText()).length > 0, 'server-side validation errors are shown per field');
await page.fill('#f-name', `E2E Railway Halt ${stamp}`);
await page.fill('#f-summary', 'Small halt station near Udhwa village on the loop line.');
await page.selectOption('#f-categorySlug', { index: 1 });
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForURL('**/account/contributions/**');
check(await seen(page, 'Waiting for the Udhwa team'), 'submission page shows status “Submitted”');
const placeContributionUrl = page.url();

section('Photo contribution with a Cloudinary upload');
await open(page, `${WEB}/contribute/photo`);
await page.setInputFiles('input[type=file]', FIXTURE('udhwa-lake-storks.jpg'));
await page.waitForSelector('button:has-text("Replace")', { timeout: 20000 });
const photoMediaId = await page.inputValue('input[name=mediaId]');
check(/^[a-z0-9]{20,}$/.test(photoMediaId), 'upload is signed, sent to Cloudinary and registered as Media', photoMediaId);
await page.fill('#f-title', `Storks at the lake ${stamp}`);
await page.fill('#f-alt', 'Open-billed storks standing in shallow water at Udhwa Lake');
await page.check('input[name=isOwnPhoto]');
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForURL('**/account/contributions/**');
check(await seen(page, 'Waiting for the Udhwa team'), 'photo contribution submitted');
const photoContributionUrl = page.url();

section('Upload validation');
// Another user uploads an image; this user then tries to claim it.
const other = await newPage(await signedInContext(browser, `e2e.other.${stamp}@example.com`));
await open(other, `${WEB}/contribute/photo`);
await other.setInputFiles('input[type=file]', FIXTURE('phone-coding.jpg'));
await other.waitForSelector('button:has-text("Replace")', { timeout: 20000 });
const othersPublicId = (await mockState()).assets.at(-1);
const othersMediaId = await other.inputValue('input[name=mediaId]');
const bad = await page.evaluate(async (publicId) => {
  const sign = await fetch('/api/v1/media/sign', { method: 'POST' }).then((x) => x.json());
  const reg = await fetch('/api/v1/media', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ publicId }) });
  return { sign, reg: reg.status };
}, othersPublicId);
check(bad.sign.folder?.includes('/contributions/') && bad.sign.limits?.maxBytes === 10 * 1024 * 1024, 'contributors get a per-user folder; limits come from the server');
check(bad.reg === 403, 'registering someone else’s upload is refused', String(bad.reg));
await other.context().close();

section('Blog contribution with an inline image (Tiptap → Media usage)');
await open(page, `${WEB}/contribute/blog`);
await page.fill('#f-title', `A morning at Berhale Lake ${stamp}`);
await page.fill('#f-excerpt', 'What you see, hear and smell on a slow winter morning at the quieter lake.');
await page.locator('.tiptap').first().click();
await page.keyboard.type('Start at the east bank just after sunrise.');
await page.setInputFiles('input[type=file]', FIXTURE('udhwa-lake-hills.jpg')); // the editor's image button input
await page.waitForSelector('.tiptap img', { timeout: 20000 });
const content = JSON.parse(await page.inputValue('input[name=content]'));
const img = content.content.find((n) => n.type === 'image');
check(img?.attrs?.mediaId && img.attrs.src.startsWith('https://res.cloudinary.com/'), 'inserted image carries its Media id', JSON.stringify(img?.attrs));
await page.click('button[type=submit]:has-text("Send for review")');
await page.waitForURL('**/account/contributions/**');
check(await seen(page, 'Waiting for the Udhwa team'), 'blog contribution submitted');
const blogContributionUrl = page.url();

section('Forged image in rich text is rejected');
const forged = await page.evaluate(async (stamp) => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello there, this is a long enough article.' }] }, { type: 'image', attrs: { src: 'https://res.cloudinary.com/someone-else/image/upload/x.jpg', alt: 'x' } }] };
  const r = await fetch('/api/v1/contributions/blog', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: `Forged image test ${stamp}`, excerpt: 'Trying to embed an image that is not in the library.', content: doc }),
  });
  return { status: r.status, body: await r.json() };
}, stamp);
check(forged.status === 422 && forged.body.fieldErrors?.content, 'images that aren’t library media are refused', JSON.stringify(forged));
const borrowed = await page.evaluate(async ([stamp, mediaId]) => {
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Trying to borrow somebody else’s upload here.' }] }, { type: 'image', attrs: { src: '/seed/phone-coding.jpg', mediaId, alt: 'x' } }] };
  const r = await fetch('/api/v1/contributions/blog', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: `Borrowed image test ${stamp}`, excerpt: 'Embedding another contributor’s pending upload by id.', content: doc }),
  });
  return { status: r.status, body: await r.json() };
}, [stamp, othersMediaId]);
check(borrowed.status === 422 && /uploaded yourself/.test(JSON.stringify(borrowed.body)), 'another contributor’s upload can’t be embedded (even with a bundled-looking src)', JSON.stringify(borrowed));

section('Withdraw a contribution (its upload is cleaned up)');
await open(page, photoContributionUrl);
const before = await mockState();
await page.click('button:has-text("Withdraw")');
await seen(page, 'Withdrawn');
const after = await mockState();
check(after.destroyed.length > before.destroyed.length, 'withdrawing deletes the unused upload from Cloudinary', `${before.destroyed.length} → ${after.destroyed.length}`);
const reuse = await page.evaluate(async (mediaId) => (await fetch('/api/v1/contributions/photo', {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ mediaId, title: 'Reuse', alt: 'Trying to reuse a deleted upload', isOwnPhoto: true }),
})).status, photoMediaId);
check(reuse === 422, 'a deleted upload can’t be reused', String(reuse));

section('Correction on a published business');
await open(page, `${WEB}/businesses/haya-mart`);
await page.click('text=Suggest a correction');
await page.waitForURL('**/contribute/correction**');
await page.waitForLoadState('networkidle');
await page.fill('#k-message', 'The phone number has an extra digit on the board outside.');
await page.click('button:has-text("Send to the Udhwa team")');
check(await seen(page, 'the Udhwa team will review this'), 'correction submitted');

section('Account shows everything sent');
await open(page, `${WEB}/account`);
const text = await page.locator('main').innerText();
check(text.includes(`E2E Railway Halt ${stamp}`) && text.includes(`A morning at Berhale Lake ${stamp}`), 'contributions listed with their status');
check(text.toLowerCase().includes('haya mart'), 'correction listed');
await open(page, placeContributionUrl);
check(await seen(page, 'Waiting for the Udhwa team'), 'submission status page reachable from the account');
void blogContributionUrl;

section('Authorization');
const adminCall = await page.evaluate(() => fetch('/api/v1/admin/counts').then((x) => x.status));
check(adminCall === 404, 'the public site’s proxy doesn’t expose the admin API', String(adminCall));
const direct = await fetch(`${API}/v1/admin/counts`, { headers: { authorization: `Bearer ${session?.value}` } });
check(direct.status === 403, 'the API refuses admin endpoints for regular users', String(direct.status));
const adminPage = await newPage(page.context());
await open(adminPage, `${ADMIN}/`);
check(new URL(adminPage.url()).pathname === '/signin', 'a regular user can’t open the admin app', adminPage.url());
const csrf = await fetch(`${API}/v1/me/profile`, { method: 'PATCH', headers: { cookie: `udhwa_session=${session?.value}`, 'content-type': 'application/json', origin: 'https://evil.example' }, body: '{"name":"Hacked"}' });
check(csrf.status === 403, 'cookie-authenticated cross-site writes are blocked (CSRF)', String(csrf.status));

section('Sign out');
await open(page, `${WEB}/account`);
await page.evaluate(() => fetch('/api/v1/auth/logout', { method: 'POST', headers: { 'x-udhwa-client': 'web' } }));
const meAfter = await page.evaluate(() => fetch('/api/v1/auth/me').then((x) => x.json()));
check(meAfter.user === null, 'logout ends the session');
const reused = await fetch(`${API}/v1/auth/me`, { headers: { authorization: `Bearer ${session?.value}` } }).then((x) => x.json());
check(reused.user === null, 'the old session token is revoked server-side');

check(page.errors.length === 0, 'no uncaught browser errors', page.errors.join(' | '));
await done(browser);
