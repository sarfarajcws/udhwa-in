import { test } from "node:test";
import assert from "node:assert/strict";
import { ENTITIES } from "@/lib/entities";
import { pkcePair, readState, safeReturnTo, signState } from "../src/lib/auth";
import { parseEntityForm } from "../src/services/admin/parse";

test("OAuth state cookie: round-trips, rejects tampering and expiry", () => {
  const base = { state: "s", verifier: "v", nonce: "n", returnTo: "/account", base: "http://localhost:3000/api" };
  const ok = signState({ ...base, exp: Date.now() + 60_000 });
  assert.deepEqual(readState(ok)?.returnTo, "/account");
  const [body, sig] = ok.split(".");
  const forged = Buffer.from(JSON.stringify({ ...base, returnTo: "https://evil.example", exp: Date.now() + 60_000 })).toString("base64url");
  assert.equal(readState(`${forged}.${sig}`), null, "body swapped");
  const altered = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
  assert.equal(readState(`${body}.${altered}`), null, "signature altered");
  assert.equal(readState(signState({ ...base, exp: Date.now() - 1 })), null, "expired");
  assert.equal(readState(undefined), null);
});

test("PKCE pair is S256-shaped and unique", () => {
  const a = pkcePair();
  const b = pkcePair();
  assert.match(a.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a.verifier, b.verifier);
});

test("returnTo only allows same-site relative paths", () => {
  assert.equal(safeReturnTo("/contribute/photo"), "/contribute/photo");
  assert.equal(safeReturnTo("//evil.example"), "/account");
  assert.equal(safeReturnTo("https://evil.example"), "/account");
  assert.equal(safeReturnTo("/\\evil.example"), "/account");
  assert.equal(safeReturnTo(undefined), "/account");
});

test("admin entity input: JSON clients and HTML forms parse the same", () => {
  const fromForm = parseEntityForm(ENTITIES.place, { name: "Udhwa Block Office", summary: "Block development office for Udhwa.", featured: "on", noIndex: "", latitude: "24.98" });
  const fromJson = parseEntityForm(ENTITIES.place, { name: "Udhwa Block Office", summary: "Block development office for Udhwa.", featured: true, noIndex: false, latitude: 24.98 });
  assert.ok(fromForm.ok && fromJson.ok);
  if (fromForm.ok && fromJson.ok) {
    assert.equal(fromForm.data.slug, "udhwa-block-office");
    assert.equal(fromForm.data.featured, true);
    assert.equal(fromJson.data.featured, true);
    assert.equal(fromJson.data.latitude, 24.98);
    assert.equal(fromJson.data.noIndex, false);
  }
});

test("admin entity input: validation errors are per field", () => {
  const r = parseEntityForm(ENTITIES.business, { name: "", summary: "x", website: "javascript:alert(1)", latitude: "200", openingHours: "not json" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["latitude", "name", "openingHours", "website"]);
});

test("admin entity input: rich text is sanitised", () => {
  const r = parseEntityForm(ENTITIES.news, {
    title: "A headline that is long enough", excerpt: "Summary", language: "en",
    content: JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] }),
  });
  assert.ok(r.ok);
  if (r.ok) assert.equal(JSON.stringify(r.data.content).includes("javascript"), false);
});
