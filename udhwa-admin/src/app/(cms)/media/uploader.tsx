"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminBtn } from "@/components/ui";
import { UPLOAD_MIME_TYPES, uploadImage } from "@/components/ui/image-upload";

export function MediaUploader({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) await uploadImage(f, "");
      router.refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <>
      <button type="button" className={adminBtn.primary} disabled={!enabled || busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload images
      </button>
      <input ref={ref} type="file" multiple accept={UPLOAD_MIME_TYPES.join(",")} className="hidden" onChange={(e) => onFiles(e.target.files)} />
    </>
  );
}
