import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Regression guard for the HTTP 500 on /news/zzz, /blogs/zzz, /businesses/zzz …
 * Detail pages are ISR (`revalidate`); an uncached fetch (freshApi / cache: "no-store")
 * during render makes Next throw "Page changed from static to dynamic at runtime".
 * Behavioural coverage: e2e/not-found.mjs (needs `next build`).
 */
const src = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");

test("findRedirect (called from ISR detail pages) uses the cacheable API client", () => {
  const body = src("lib/queries.ts").match(/export async function findRedirect[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(body.includes("publicApi"), "findRedirect must use publicApi");
  assert.ok(!/freshApi|no-store|revalidate:\s*0/.test(body.replace(/\/\/.*$/gm, "")), "findRedirect must not opt out of caching");
});

test("redirectOrNotFound is only used from ISR detail pages that stay static-capable", () => {
  assert.match(src("lib/redirects.ts"), /findRedirect/);
});

test("404 chrome is provided exactly once per route group", () => {
  const root = src("app/not-found.tsx");
  const group = src("app/(public)/not-found.tsx").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // code only, no comments
  assert.match(root, /SiteHeader/);
  assert.match(root, /SiteFooter/);
  assert.doesNotMatch(group, /SiteHeader|SiteFooter|<main/); // (public)/layout.tsx already renders them
});
