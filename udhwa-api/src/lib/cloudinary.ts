import { createHash, randomBytes } from "node:crypto";
import { cloudinaryEnabled, env, isProd } from "../env";

/**
 * Cloudinary integration (REST, no SDK).
 *
 * Upload flow — no file ever touches our servers:
 *   1. Client asks POST /v1/media/sign for a short-lived signature. The signed
 *      parameters pin the folder (per-user for contributors, the library for
 *      admins), the allowed formats and an incoming resize, so a client can't
 *      change them.
 *   2. Browser uploads directly to Cloudinary.
 *   3. Client posts the resulting public_id to POST /v1/media. We fetch the
 *      asset from Cloudinary's Admin API and verify folder, format, size and
 *      dimensions before a Media row is created. Anything that fails is
 *      destroyed.
 */

/** One source of truth for upload limits (returned to clients with every signature). */
export const UPLOAD_LIMITS = {
  maxBytes: 10 * 1024 * 1024,
  /** Cloudinary format names. */
  formats: ["jpg", "jpeg", "png", "webp", "heic", "heif", "avif"],
  /** Matching browser MIME types for <input accept> and pre-upload checks. */
  mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"],
  /** Longest edge stored after Cloudinary's incoming resize. */
  maxDimension: 4000,
  /** Reject decompression-bomb style images. */
  maxPixels: 60_000_000,
} as const;

/** Stored originals are capped at maxDimension on the longest edge. */
const INCOMING_TRANSFORMATION = `c_limit,w_${UPLOAD_LIMITS.maxDimension},h_${UPLOAD_LIMITS.maxDimension}`;

/**
 * Cloudinary's API host. Overridable only outside production, so automated
 * tests can run against a local stand-in.
 */
function apiBase() {
  const override = !isProd ? process.env.CLOUDINARY_API_BASE_URL : undefined;
  return (override || "https://api.cloudinary.com").replace(/\/$/, "");
}

/** Cloudinary request signature: sorted `k=v` pairs joined by `&`, secret appended, SHA-1. */
export function cloudinarySignature(params: Record<string, string | number>, secret = env.CLOUDINARY_API_SECRET) {
  const toSign = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + secret).digest("hex");
}

export function uploadFolder(user: { id: string; role: string }) {
  return user.role === "ADMIN" ? `${env.CLOUDINARY_FOLDER}/library` : `${env.CLOUDINARY_FOLDER}/contributions/${user.id}`;
}

/**
 * One signature = one asset: the server picks the public_id and forbids
 * overwriting, so a signature can't be reused to upload many files or to
 * swap an image after it has been verified and approved.
 */
export function signUpload(folder: string) {
  const params = {
    folder,
    public_id: randomBytes(12).toString("hex"),
    overwrite: "false",
    timestamp: Math.round(Date.now() / 1000),
    allowed_formats: UPLOAD_LIMITS.formats.join(","),
    transformation: INCOMING_TRANSFORMATION,
  };
  return {
    ...params,
    signature: cloudinarySignature(params),
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    uploadUrl: `${apiBase()}/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    limits: { maxBytes: UPLOAD_LIMITS.maxBytes, mimeTypes: UPLOAD_LIMITS.mimeTypes, formats: UPLOAD_LIMITS.formats },
  };
}

export type CloudinaryAsset = {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resource_type?: string;
  type?: string;
  folder?: string;
  asset_folder?: string;
};

function authHeader() {
  return `Basic ${Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString("base64")}`;
}

/** Admin API lookup. Returns null when the asset doesn't exist. */
export async function fetchAsset(publicId: string): Promise<CloudinaryAsset | null> {
  if (!cloudinaryEnabled) return null;
  const path = publicId.split("/").map(encodeURIComponent).join("/");
  const res = await fetch(`${apiBase()}/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload/${path}`, {
    headers: { authorization: authHeader() },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Cloudinary lookup failed (${res.status})`);
  return (await res.json()) as CloudinaryAsset;
}

/**
 * Deletes an asset (and invalidates CDN copies). Returns true when it is gone
 * (including "not found"); false when Cloudinary couldn't be reached, so the
 * caller can record it for a later retry.
 */
export async function destroyAsset(publicId: string): Promise<boolean> {
  if (!cloudinaryEnabled) return false;
  const params = { public_id: publicId, timestamp: Math.round(Date.now() / 1000), invalidate: "true" };
  const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: env.CLOUDINARY_API_KEY, signature: cloudinarySignature(params) });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${apiBase()}/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
      const json = (await res.json().catch(() => ({}))) as { result?: string };
      if (res.ok && (json.result === "ok" || json.result === "not found")) return true;
      console.warn(`[cloudinary] destroy ${publicId} attempt ${attempt}: ${res.status} ${json.result ?? ""}`);
    } catch (e) {
      console.warn(`[cloudinary] destroy ${publicId} attempt ${attempt}: ${e instanceof Error ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, 300 * attempt));
  }
  return false;
}

/** Checks a fetched asset against our limits. Returns an error message or null. */
export function assetProblem(asset: CloudinaryAsset, folder: string): string | null {
  const inFolder = asset.public_id.startsWith(`${folder}/`) || asset.asset_folder === folder || asset.folder === folder;
  if (!inFolder) return "Upload is outside your folder.";
  if (asset.resource_type && asset.resource_type !== "image") return "Only images can be uploaded.";
  if (!(UPLOAD_LIMITS.formats as readonly string[]).includes(String(asset.format).toLowerCase())) return "Images must be JPG, PNG, WebP, HEIC or AVIF.";
  if (!(asset.bytes > 0) || asset.bytes > UPLOAD_LIMITS.maxBytes) return "Images must be under 10 MB.";
  if (!(asset.width > 0 && asset.height > 0) || asset.width * asset.height > UPLOAD_LIMITS.maxPixels) return "That image’s dimensions aren’t supported.";
  if (!/^https:\/\/res\.cloudinary\.com\//.test(asset.secure_url) || !asset.secure_url.includes(`/${env.CLOUDINARY_CLOUD_NAME}/`)) return "Unexpected image URL.";
  return null;
}
