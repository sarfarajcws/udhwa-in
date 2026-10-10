import { test } from "node:test";
import assert from "node:assert/strict";
import { redirectCandidates, trimTrailingSlash } from "../src/lib/redirect-path";

test("trailing slashes are trimmed, the root is kept", () => {
  assert.equal(trimTrailingSlash("/news/news-4.html/"), "/news/news-4.html");
  assert.equal(trimTrailingSlash("/a//"), "/a");
  assert.equal(trimTrailingSlash("/"), "/");
});

test("redirect candidates: exact first, then decoded and slash-trimmed forms", () => {
  assert.deepEqual(redirectCandidates("/news/news-4.html"), ["/news/news-4.html"]);
  assert.deepEqual(redirectCandidates("/news/news-4.html/"), ["/news/news-4.html/", "/news/news-4.html"]);
  assert.deepEqual(redirectCandidates("/blogs/%E0%A4%AA%E0%A4%B0.html"), ["/blogs/%E0%A4%AA%E0%A4%B0.html", "/blogs/पर.html"]);
  assert.deepEqual(redirectCandidates("/bad%ZZ.html"), ["/bad%ZZ.html"]); // malformed encoding must not throw
  assert.deepEqual(redirectCandidates("no-leading-slash"), []);
  assert.deepEqual(redirectCandidates("//evil.com"), ["//evil.com"]); // lookup only; the destination always comes from the table
});
