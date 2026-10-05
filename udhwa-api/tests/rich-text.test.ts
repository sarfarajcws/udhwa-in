import { test } from "node:test";
import assert from "node:assert/strict";
import { generateJSON } from "@tiptap/html/server";
import { richTextExtensions } from "../src/lib/rich-text/extensions";
import { docToText, isDocEmpty, isSafeHref, isSafeImageSrc, readingMinutes, sanitizeDoc } from "../src/lib/rich-text/schema";

test("drops javascript: and data: links but keeps safe ones", () => {
  const doc = sanitizeDoc({
    type: "doc",
    content: [{ type: "paragraph", content: [
      { type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
      { type: "text", text: "data", marks: [{ type: "link", attrs: { href: "data:text/html,<script>" } }] },
      { type: "text", text: "ok", marks: [{ type: "link", attrs: { href: "https://udhwa.in" } }] },
      { type: "text", text: "rel", marks: [{ type: "link", attrs: { href: "/places/x" } }] },
    ] }],
  });
  const marks = doc.content[0].content!.map((n) => n.marks?.[0]?.attrs?.href ?? null);
  assert.deepEqual(marks, [null, null, "https://udhwa.in", "/places/x"]);
});

test("strips unknown node types, attributes and marks", () => {
  const doc = sanitizeDoc({
    type: "doc",
    content: [
      { type: "iframe", attrs: { src: "https://evil" } },
      { type: "paragraph", attrs: { onclick: "x()", class: "y" }, content: [{ type: "text", text: "hi", marks: [{ type: "script" }, { type: "bold", attrs: { style: "x" } }] }] },
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "H" }] },
    ],
  });
  assert.equal(doc.content.length, 2);
  assert.equal(doc.content[0].attrs, undefined);
  assert.deepEqual(doc.content[0].content![0].marks, [{ type: "bold" }]);
  assert.equal(doc.content[1].attrs!.level, 2, "h1 demoted to h2 (page has its own h1)");
});

test("images only from Cloudinary or bundled seed paths", () => {
  assert.equal(isSafeImageSrc("https://res.cloudinary.com/demo/image/upload/v1/a.jpg"), true);
  assert.equal(isSafeImageSrc("/seed/udhwa-lake-storks.jpg"), true);
  assert.equal(isSafeImageSrc("/seed/../../etc/passwd"), false);
  assert.equal(isSafeImageSrc("http://res.cloudinary.com/x.jpg"), false);
  assert.equal(isSafeImageSrc("https://evil.com/x.jpg"), false);
  const doc = sanitizeDoc({ type: "doc", content: [{ type: "image", attrs: { src: "https://evil.com/x.png", alt: "x" } }] });
  assert.equal(doc.content[0].type, "paragraph", "bad image removed, empty doc gets a paragraph");
});

test("href validator", () => {
  assert.equal(isSafeHref("mailto:a@b.co"), true);
  assert.equal(isSafeHref("tel:+911234567890"), true);
  assert.equal(isSafeHref("//evil.com"), false);
  assert.equal(isSafeHref(" JAVASCRIPT:alert(1)"), false);
});

test("bounds hostile input size", () => {
  const huge = { type: "doc", content: Array.from({ length: 30_000 }, () => ({ type: "paragraph", content: [{ type: "text", text: "x" }] })) };
  const doc = sanitizeDoc(huge);
  assert.ok(doc.content.length < 30_000);
  assert.deepEqual(sanitizeDoc("not json"), { type: "doc", content: [{ type: "paragraph" }] });
  assert.deepEqual(sanitizeDoc({ type: "notdoc" }), { type: "doc", content: [{ type: "paragraph" }] });
});

test("editor HTML round-trips through the allow-list (legacy importer path)", () => {
  const json = generateJSON('<h2>Visiting</h2><p>Best <strong>Nov–Mar</strong> <a href="https://x.org">link</a></p><ul><li>One</li></ul><blockquote><p>Q</p></blockquote>', richTextExtensions());
  const doc = sanitizeDoc(json);
  assert.deepEqual(doc.content.map((n) => n.type), ["heading", "paragraph", "bulletList", "blockquote"]);
  assert.match(docToText(doc), /Visiting/);
  assert.equal(isDocEmpty(doc), false);
  assert.equal(readingMinutes(doc), 1);
});
