// Local stand-ins for Google OAuth and Cloudinary, for automated browser tests.
//
//   node scripts/mock-providers.mjs            (listens on :4100, or MOCK_PORT)
//
// Run the API (not in production) with:
//   GOOGLE_TEST_BASE_URL=http://localhost:4100/google
//   CLOUDINARY_API_BASE_URL=http://localhost:4100/cloudinary
// plus GOOGLE_CLIENT_ID/SECRET and CLOUDINARY_* values matching the ones below
// (read from the same .env). The API ignores both overrides when
// NODE_ENV=production.
//
// Google: /google/auth shows an account chooser, then redirects back with a
// code; /google/token checks the client secret, redirect URI and PKCE verifier
// and returns an RS256 ID token (with the nonce); /google/certs serves the JWKS.
// Cloudinary: signed uploads (signature verified exactly like Cloudinary),
// Admin API lookups (basic auth) and signed destroys. /__state lists assets
// and destroyed ids for assertions.
import 'dotenv/config';
import http from 'node:http';
import { createHash, generateKeyPairSync, randomBytes } from 'node:crypto';
import { exportJWK, SignJWT } from 'jose';

const PORT = Number(process.env.MOCK_PORT || 4100);
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...(await exportJWK(publicKey)), kid: 'mock-1', alg: 'RS256', use: 'sig' };
const codes = new Map(); // code → { email, redirectUri, challenge, nonce, clientId }
const assets = new Map(); // public_id → asset
const destroyed = [];

const sign = (params) =>
  createHash('sha1').update(Object.keys(params).filter((k) => params[k] !== '' && params[k] !== undefined).sort().map((k) => `${k}=${params[k]}`).join('&') + API_SECRET).digest('hex');

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string';
  res.writeHead(status, { 'content-type': isJson ? 'application/json' : 'text/html; charset=utf-8', 'access-control-allow-origin': '*', ...headers });
  res.end(isJson ? JSON.stringify(body) : body);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

/** Width/height from a PNG or JPEG header (enough for test fixtures). */
function dimensions(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), format: 'png' };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), format: 'jpg' };
      i += 2 + len;
    }
    return { width: 1200, height: 800, format: 'jpg' };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '', { 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': '*' });
    if (p === '/__state') return send(res, 200, { assets: [...assets.keys()], destroyed });

    // ── Google ────────────────────────────────────────────────
    if (p === '/google/certs') return send(res, 200, { keys: [jwk] });
    if (p === '/google/auth' && req.method === 'GET') {
      const q = url.searchParams;
      if (q.get('client_id') !== CLIENT_ID) return send(res, 400, 'invalid_client');
      if (q.get('response_type') !== 'code' || q.get('code_challenge_method') !== 'S256' || !q.get('code_challenge') || !q.get('state') || !q.get('nonce')) return send(res, 400, 'invalid_request');
      const hidden = [...q].map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, '&quot;')}">`).join('');
      return send(res, 200, `<!doctype html><title>Choose an account (mock Google)</title><form method="post" action="/google/auth">${hidden}
        <label>Email <input id="mock-google-email" name="email" type="email" required></label>
        <button id="mock-google-continue" type="submit">Continue</button>
        <button id="mock-google-cancel" type="submit" name="deny" value="1" formnovalidate>Cancel</button></form>`);
    }
    if (p === '/google/auth' && req.method === 'POST') {
      const f = new URLSearchParams((await readBody(req)).toString());
      const back = new URL(f.get('redirect_uri'));
      back.searchParams.set('state', f.get('state'));
      if (f.get('deny')) back.searchParams.set('error', 'access_denied');
      else {
        const code = randomBytes(12).toString('hex');
        codes.set(code, { email: f.get('email').toLowerCase(), redirectUri: f.get('redirect_uri'), challenge: f.get('code_challenge'), nonce: f.get('nonce'), clientId: f.get('client_id') });
        back.searchParams.set('code', code);
      }
      res.writeHead(302, { location: back.toString() });
      return res.end();
    }
    if (p === '/google/token' && req.method === 'POST') {
      const f = new URLSearchParams((await readBody(req)).toString());
      const c = codes.get(f.get('code'));
      codes.delete(f.get('code'));
      if (!c) return send(res, 400, { error: 'invalid_grant' });
      if (f.get('client_id') !== CLIENT_ID || f.get('client_secret') !== CLIENT_SECRET) return send(res, 401, { error: 'invalid_client' });
      if (f.get('redirect_uri') !== c.redirectUri) return send(res, 400, { error: 'redirect_uri_mismatch' });
      if (createHash('sha256').update(f.get('code_verifier') ?? '').digest('base64url') !== c.challenge) return send(res, 400, { error: 'invalid_grant', error_description: 'PKCE' });
      const idToken = await new SignJWT({ email: c.email, email_verified: true, nonce: c.nonce, name: c.email.split('@')[0].replace(/[._]/g, ' ') })
        .setProtectedHeader({ alg: 'RS256', kid: 'mock-1' }).setIssuer('https://accounts.google.com').setAudience(c.clientId)
        .setSubject(`mock-${createHash('sha1').update(c.email).digest('hex').slice(0, 16)}`).setIssuedAt().setExpirationTime('5m').sign(privateKey);
      return send(res, 200, { id_token: idToken, access_token: 'mock', token_type: 'Bearer', expires_in: 3600 });
    }

    // ── Cloudinary ────────────────────────────────────────────
    const base = `/cloudinary/v1_1/${CLOUD}`;
    if (p === `${base}/image/upload` && req.method === 'POST') {
      const request = new Request(url, { method: 'POST', headers: req.headers, body: await readBody(req) });
      const form = await request.formData();
      const file = form.get('file');
      const params = {};
      for (const [k, v] of form) if (!['file', 'api_key', 'signature', 'resource_type', 'cloud_name'].includes(k)) params[k] = String(v);
      if (form.get('api_key') !== API_KEY || form.get('signature') !== sign(params)) return send(res, 401, { error: { message: 'Invalid Signature' } });
      if (Math.abs(Date.now() / 1000 - Number(params.timestamp)) > 3600) return send(res, 400, { error: { message: 'Stale request' } });
      const buf = Buffer.from(await file.arrayBuffer());
      const dims = dimensions(buf);
      const allowed = (params.allowed_formats ?? '').split(',');
      if (!dims || (allowed.length && !allowed.includes(dims.format))) return send(res, 400, { error: { message: 'Image file format not allowed' } });
      const id = `${params.folder ? `${params.folder}/` : ''}${params.public_id || randomBytes(8).toString('hex')}`;
      if (assets.has(id) && params.overwrite === 'false') return send(res, 200, { ...assets.get(id), existing: true });
      const asset = {
        public_id: id, format: dims.format, width: dims.width, height: dims.height, bytes: buf.length, resource_type: 'image', type: 'upload',
        secure_url: `https://res.cloudinary.com/${CLOUD}/image/upload/v1/${id}.${dims.format}`, asset_folder: params.folder,
      };
      assets.set(id, asset);
      return send(res, 200, asset);
    }
    if (p.startsWith(`${base}/resources/image/upload/`) && req.method === 'GET') {
      if (req.headers.authorization !== `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`) return send(res, 401, { error: { message: 'Unauthorized' } });
      const id = decodeURIComponent(p.slice(`${base}/resources/image/upload/`.length));
      const a = assets.get(id);
      return a ? send(res, 200, a) : send(res, 404, { error: { message: 'Resource not found' } });
    }
    if (p === `${base}/image/destroy` && req.method === 'POST') {
      const f = new URLSearchParams((await readBody(req)).toString());
      const params = Object.fromEntries([...f].filter(([k]) => !['api_key', 'signature'].includes(k)));
      if (f.get('api_key') !== API_KEY || f.get('signature') !== sign(params)) return send(res, 401, { error: { message: 'Invalid Signature' } });
      const existed = assets.delete(params.public_id);
      destroyed.push(params.public_id);
      return send(res, 200, { result: existed ? 'ok' : 'not found' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error('[mock]', e);
    send(res, 500, { error: String(e) });
  }
});

server.listen(PORT, () => console.log(`Mock Google + Cloudinary on http://localhost:${PORT}`));
