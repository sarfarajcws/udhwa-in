import { test } from "node:test";
import assert from "node:assert/strict";
import { toTsQueryForTest } from "./helpers";
import { correctionSchema, placeContribution, photoContribution, profileSchema } from "../src/lib/validation";

test("tsquery builder neutralises operators and supports Hindi", () => {
  assert.equal(toTsQueryForTest("udhwa lake"), "udhwa:* & lake:*");
  assert.equal(toTsQueryForTest("lake' | !drop & (x)"), "lake:* & drop:*");
  assert.equal(toTsQueryForTest("परीक्षा"), "परीक्षा:*");
  assert.equal(toTsQueryForTest("a"), null);
  assert.equal(toTsQueryForTest("  "), null);
});

test("place contribution validation", () => {
  assert.equal(placeContribution.safeParse({ name: "X", summary: "short" }).success, false);
  const ok = placeContribution.safeParse({ name: "Udhwa Block Office", summary: "Block development office for Udhwa.", sourceUrl: "" });
  assert.equal(ok.success, true);
  assert.equal(placeContribution.safeParse({ name: "Udhwa", summary: "A long enough summary", sourceUrl: "javascript:alert(1)" }).success, false);
});

test("photo contribution requires permission confirmation", () => {
  const base = { mediaId: "m1", title: "Lake", alt: "Storks in the lake" };
  assert.equal(photoContribution.safeParse(base).success, false);
  assert.equal(photoContribution.safeParse({ ...base, isOwnPhoto: true }).success, true);
});

test("ownership claims need a business and a phone", () => {
  const base = { target: "business", id: "abc", kind: "OWNERSHIP_CLAIM", message: "I run this shop since 2019." };
  assert.equal(correctionSchema.safeParse(base).success, false);
  assert.equal(correctionSchema.safeParse({ ...base, contactPhone: "+91 79798 56599" }).success, true);
  assert.equal(correctionSchema.safeParse({ ...base, target: "place", contactPhone: "+91 79798 56599" }).success, false);
});

test("usernames", () => {
  assert.equal(profileSchema.safeParse({ name: "Priya", username: "admin" }).success, false);
  assert.equal(profileSchema.safeParse({ name: "Priya", username: "Priya-K" }).success, true);
  assert.equal(profileSchema.safeParse({ name: "Priya", username: "-x-" }).success, false);
});
