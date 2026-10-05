import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, createApiClient, orNull } from "../src/lib/api-client";
import { proxyToApi } from "../src/lib/api-proxy";

type Call = { url: string; init: RequestInit };
function mockFetch(respond: (c: Call) => Response) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    const c = { url: String(url), init };
    calls.push(c);
    return respond(c);
  }) as typeof fetch;
  return calls;
}

test("client: bearer token, query string, date revival, typed errors", async () => {
  const calls = mockFetch(() => Response.json({ publishedAt: "2026-03-06T03:30:00.000Z", n: 1 }));
  const api = createApiClient({ baseUrl: "http://api/", token: () => "tok", client: "test" });
  const r = await api.get<{ publishedAt: Date }>("/v1/news", { query: { q: "lake", page: 2, empty: "" } });
  assert.ok(r.publishedAt instanceof Date);
  assert.equal(calls[0].url, "http://api/v1/news?q=lake&page=2");
  const h = calls[0].init.headers as Record<string, string>;
  assert.equal(h.authorization, "Bearer tok");
  assert.equal(h["x-udhwa-client"], "test");

  mockFetch(() => Response.json({ error: "Please fix", fieldErrors: { name: ["Required"] } }, { status: 422 }));
  await assert.rejects(api.post("/v1/x", {}), (e) => e instanceof ApiError && e.status === 422 && e.fieldErrors?.name?.[0] === "Required");

  mockFetch(() => Response.json({ error: "Not found" }, { status: 404 }));
  assert.equal(await orNull(api.get("/v1/places/nope")), null);
});

test("proxy: rewrites path, forwards origin headers, keeps every Set-Cookie, no redirect following", async () => {
  const calls = mockFetch(() => {
    const headers = new Headers({ location: "https://accounts.google.com/x", "content-encoding": "gzip" });
    headers.append("set-cookie", "a=1; Path=/");
    headers.append("set-cookie", "b=2; Path=/");
    return new Response(null, { status: 302, headers });
  });
  const res = await proxyToApi(new Request("http://localhost:3000/api/v1/auth/google?returnTo=/account", { headers: { host: "localhost:3000" } }), { apiUrl: "http://api:4000", client: "web" });
  assert.equal(calls[0].url, "http://api:4000/v1/auth/google?returnTo=/account");
  assert.equal(calls[0].init.redirect, "manual");
  const fwd = calls[0].init.headers as Headers;
  assert.equal(fwd.get("x-forwarded-host"), "localhost:3000");
  assert.equal(fwd.get("x-udhwa-prefix"), "/api");
  assert.equal(res.status, 302);
  assert.deepEqual(res.headers.getSetCookie(), ["a=1; Path=/", "b=2; Path=/"]);
  assert.equal(res.headers.get("content-encoding"), null);
});

test("proxy: blocks cross-site writes", async () => {
  const calls = mockFetch(() => Response.json({ ok: true }));
  const res = await proxyToApi(new Request("http://localhost:3000/api/v1/corrections", { method: "POST", headers: { host: "localhost:3000", origin: "https://evil.example" }, body: "{}" }), { apiUrl: "http://api", client: "web" });
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
});

test("proxy: blocked API paths never reach the API (incl. encoded and doubled slashes)", async () => {
  const calls = mockFetch(() => Response.json({ ok: true }));
  const opts = { apiUrl: "http://api", client: "web", blockPaths: ["/v1/admin"] };
  for (const path of ["/api/v1/admin/users", "/api/v1/admin", "/api/v1//admin/media", "/api/v1/%61dmin/users", "/api/v1/ADMIN/users"]) {
    const res = await proxyToApi(new Request(`http://localhost:3000${path}`, { headers: { host: "localhost:3000" } }), opts);
    assert.equal(res.status, 404, path);
  }
  assert.equal(calls.length, 0);
  const ok = await proxyToApi(new Request("http://localhost:3000/api/v1/administrative-areas", { headers: { host: "localhost:3000" } }), opts);
  assert.equal(ok.status, 200);
});
