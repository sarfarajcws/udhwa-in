import { test } from "node:test";
import assert from "node:assert/strict";
import { exportJWK, generateKeyPair, SignJWT, createLocalJWKSet } from "jose";
import { databaseError } from "../src/app";
import { env, productionProblems } from "../src/env";
import { roleForEmail, verifyGoogleIdToken } from "../src/lib/auth";
import { assetProblem, cloudinarySignature, signUpload, UPLOAD_LIMITS, type CloudinaryAsset } from "../src/lib/cloudinary";
import { docImages, sanitizeDoc } from "../src/lib/rich-text/schema";

test("Cloudinary signature matches Cloudinary's documented algorithm", () => {
  // Example from Cloudinary's "Generating authentication signatures" docs.
  const sig = cloudinarySignature({ eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 }, "abcd");
  assert.equal(sig, "bfd09f95f331f558cbd1320e67aa8d488770583e");
});

test("Upload signature pins folder, formats and incoming resize; limits are exposed", () => {
  const s = signUpload("udhwa/contributions/u1");
  assert.equal(s.folder, "udhwa/contributions/u1");
  assert.equal(s.allowed_formats, UPLOAD_LIMITS.formats.join(","));
  assert.match(s.transformation, /^c_limit,w_4000,h_4000$/);
  assert.match(s.public_id, /^[a-f0-9]{24}$/);
  assert.equal(s.overwrite, "false");
  assert.equal(s.signature, cloudinarySignature({ folder: s.folder, public_id: s.public_id, overwrite: "false", timestamp: s.timestamp, allowed_formats: s.allowed_formats, transformation: s.transformation }));
  assert.notEqual(signUpload("udhwa/library").public_id, s.public_id, "every signature names a fresh asset");
  assert.equal(s.limits.maxBytes, 10 * 1024 * 1024);
  assert.ok(s.uploadUrl.endsWith("/v1_1/udhwa-test/image/upload"));
});

test("Uploaded assets are verified against folder, type, size and dimensions", () => {
  const ok: CloudinaryAsset = {
    public_id: "udhwa/contributions/u1/abc", secure_url: "https://res.cloudinary.com/udhwa-test/image/upload/v1/udhwa/contributions/u1/abc.jpg",
    width: 1200, height: 800, format: "jpg", bytes: 200_000, resource_type: "image",
  };
  assert.equal(assetProblem(ok, "udhwa/contributions/u1"), null);
  assert.match(assetProblem(ok, "udhwa/contributions/u2")!, /outside your folder/);
  assert.equal(assetProblem({ ...ok, public_id: "abc", asset_folder: "udhwa/contributions/u1" }, "udhwa/contributions/u1"), null, "dynamic folder mode");
  assert.match(assetProblem({ ...ok, format: "gif" }, "udhwa/contributions/u1")!, /JPG/);
  assert.match(assetProblem({ ...ok, format: "svg" }, "udhwa/contributions/u1")!, /JPG/);
  assert.match(assetProblem({ ...ok, bytes: 11 * 1024 * 1024 }, "udhwa/contributions/u1")!, /10 MB/);
  assert.match(assetProblem({ ...ok, width: 10000, height: 10000 }, "udhwa/contributions/u1")!, /dimensions/);
  assert.match(assetProblem({ ...ok, secure_url: "https://res.cloudinary.com/someone-else/image/upload/x.jpg" }, "udhwa/contributions/u1")!, /URL/);
});

test("Rich-text images keep a valid mediaId and drop a forged one", () => {
  const doc = sanitizeDoc({
    type: "doc",
    content: [
      { type: "image", attrs: { src: "https://res.cloudinary.com/udhwa-test/image/upload/a.jpg", mediaId: "cmabcdefghijklmnopqrstu", alt: "A" } },
      { type: "image", attrs: { src: "https://res.cloudinary.com/udhwa-test/image/upload/b.jpg", mediaId: "x\"><script>", alt: "B" } },
      { type: "image", attrs: { src: "javascript:alert(1)", mediaId: "cmabcdefghijklmnopqrstu" } },
    ],
  });
  const imgs = docImages(doc);
  assert.equal(imgs.length, 2);
  assert.equal(imgs[0].attrs?.mediaId, "cmabcdefghijklmnopqrstu");
  assert.equal(imgs[1].attrs?.mediaId, null);
});

test("Admin access comes from ADMIN_EMAILS only", () => {
  assert.equal(roleForEmail("admin@example.com"), "ADMIN");
  assert.equal(roleForEmail("ADMIN@example.com"), "ADMIN");
  assert.equal(roleForEmail("someone@example.com"), "USER");
  assert.equal(roleForEmail(null), "USER");
});

test("Google ID tokens: audience, issuer, nonce and verified email are enforced", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, aud = env.GOOGLE_CLIENT_ID, iss = "https://accounts.google.com") =>
    new SignJWT({ email: "Person@Example.com", email_verified: true, nonce: "n1", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "k1" }).setSubject("google-sub-1").setIssuer(iss).setAudience(aud)
      .setIssuedAt().setExpirationTime("5m").sign(privateKey);

  const profile = await verifyGoogleIdToken(await sign({}), { nonce: "n1", keys });
  assert.deepEqual([profile.sub, profile.email], ["google-sub-1", "person@example.com"]);
  await assert.rejects(verifyGoogleIdToken(await sign({}), { nonce: "other", keys }), /nonce/);
  await assert.rejects(verifyGoogleIdToken(await sign({ email_verified: false }), { nonce: "n1", keys }), /not verified/);
  await assert.rejects(verifyGoogleIdToken(await sign({}, "someone-elses-client"), { nonce: "n1", keys }));
  await assert.rejects(verifyGoogleIdToken(await sign({}, env.GOOGLE_CLIENT_ID, "https://evil.example"), { nonce: "n1", keys }));
});

test("Production refuses to start without required configuration", () => {
  const base = { ...env, NODE_ENV: "production" as const };
  const missing = productionProblems({ ...base, SESSION_SECRET: undefined, REVALIDATE_SECRET: "", GOOGLE_CLIENT_SECRET: "", ADMIN_EMAILS: "", CLOUDINARY_API_SECRET: "", WEB_URL: "http://example.com" });
  assert.equal(missing.length, 7); // incl. the default http:// ADMIN_URL
  const good = productionProblems({
    ...base, SESSION_SECRET: "x".repeat(40), REVALIDATE_SECRET: "y".repeat(32), ADMIN_EMAILS: "a@b.c",
    WEB_URL: "https://udhwa.in", ADMIN_URL: "https://admin.udhwa.in",
  });
  assert.deepEqual(good, []);
});

test("Database errors map to meaningful HTTP statuses", () => {
  assert.equal(databaseError({ code: "P2025" })?.status, 404);
  assert.equal(databaseError({ code: "P2002" })?.status, 409);
  assert.equal(databaseError({ code: "P2003" })?.status, 409);
  assert.equal(databaseError({ code: "P1001" })?.status, 503);
  assert.equal(databaseError(new Error("other")), null);
});
