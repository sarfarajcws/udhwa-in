"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { SmartImage } from "./smart-image";

export type UploadedMedia = { id: string; url: string; width: number | null; height: number | null; alt: string };

/**
 * Client-side mirror of the API's limits (udhwa-api/src/lib/cloudinary.ts →
 * UPLOAD_LIMITS) for instant feedback. The signature response carries the
 * server's values, which win; the API re-verifies every upload anyway.
 */
export const UPLOAD_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = UPLOAD_MIME_TYPES.join(",");

type Signature = {
  apiKey: string; cloudName: string; folder: string; timestamp: number; signature: string;
  public_id: string; overwrite: string; allowed_formats: string; transformation: string; uploadUrl: string;
  limits: { maxBytes: number; mimeTypes: string[] };
};

function checkFile(file: File, maxBytes: number, types: string[]) {
  // Some browsers report HEIC files with an empty type; fall back to the extension.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = types.includes(file.type) || (!file.type && ["heic", "heif"].includes(ext));
  if (!typeOk) throw new Error("Please choose a JPG, PNG, WebP, HEIC or AVIF image.");
  if (file.size > maxBytes) throw new Error(`Images must be under ${Math.round(maxBytes / 1024 / 1024)} MB.`);
}

async function json(res: Response) {
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string | { message?: string } };
}

/** Uploads a file to Cloudinary via signed direct upload, then registers it with the API. */
export async function uploadImage(file: File, alt = ""): Promise<UploadedMedia> {
  checkFile(file, UPLOAD_MAX_BYTES, UPLOAD_MIME_TYPES);
  const signRes = await fetch("/api/v1/media/sign", { method: "POST" });
  const sign = (await json(signRes)) as unknown as Signature & { error?: string };
  if (!signRes.ok) throw new Error(sign.error ?? "Couldn’t start the upload.");
  checkFile(file, sign.limits.maxBytes, sign.limits.mimeTypes);

  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sign.apiKey);
  fd.append("timestamp", String(sign.timestamp));
  fd.append("signature", sign.signature);
  fd.append("folder", sign.folder);
  fd.append("public_id", sign.public_id);
  fd.append("overwrite", sign.overwrite);
  fd.append("allowed_formats", sign.allowed_formats);
  fd.append("transformation", sign.transformation);
  let up: Response;
  try {
    up = await fetch(sign.uploadUrl, { method: "POST", body: fd });
  } catch {
    throw new Error("Couldn’t reach the image service. Check your connection and try again.");
  }
  const upJson = await json(up);
  if (!up.ok) throw new Error((typeof upJson.error === "object" ? upJson.error?.message : upJson.error) ?? "Upload failed.");

  const reg = await fetch("/api/v1/media", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ publicId: upJson.public_id, alt }),
  });
  const regJson = await json(reg);
  if (!reg.ok) throw new Error((regJson.error as string) ?? "Upload couldn’t be saved.");
  return regJson as unknown as UploadedMedia;
}

/** Single-image field: preview, replace, remove. Stores the Media id in a hidden input. */
export function ImageUploadField({ name, initial, enabled, label = "Photo", onChange }: {
  name: string;
  initial?: UploadedMedia | null;
  enabled: boolean;
  label?: string;
  onChange?: (m: UploadedMedia | null) => void;
}) {
  const [media, setMedia] = useState<UploadedMedia | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const set = (m: UploadedMedia | null) => {
    setMedia(m);
    onChange?.(m);
  };

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      set(await uploadImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={media?.id ?? ""} />
      {media ? (
        <div className="relative overflow-hidden rounded-lg border border-line bg-sunken">
          <div className="relative aspect-[16/10]">
            <SmartImage src={media.url} alt={media.alt || "Uploaded image"} fill sizes="480px" className="object-cover" />
          </div>
          <div className="flex gap-2 p-2">
            <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-ink-soft ring-1 ring-line hover:bg-canvas" disabled={!enabled || busy}>
              Replace
            </button>
            <button type="button" onClick={() => set(null)} className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
              <X className="size-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={!enabled || busy}
          onClick={() => input.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong bg-surface px-4 py-10 text-sm text-muted transition-colors hover:border-brand-500 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {busy ? "Uploading…" : enabled ? "Choose an image (JPG, PNG, WebP, HEIC · up to 10 MB)" : "Image uploads aren’t configured on this server"}
        </button>
      )}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      {error && (
        <p className="mt-1.5 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
