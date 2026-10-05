"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { UPLOAD_MIME_TYPES, uploadImage } from "@/components/ui/image-upload";
import type { LibraryItem } from "@/lib/api-client";
import { adminBtn, adminInput } from "./ui";

/** Choose an image from the media library or upload a new one to Cloudinary. */
export function MediaPicker({ name, initialId, library, uploadsEnabled }: { name: string; initialId: string; library: LibraryItem[]; uploadsEnabled: boolean }) {
  const [items, setItems] = useState(library);
  const [selected, setSelected] = useState<string>(initialId);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const current = items.find((i) => i.id === selected);
  const shown = useMemo(() => items.filter((i) => !filter || i.alt.toLowerCase().includes(filter.toLowerCase()) || i.url.toLowerCase().includes(filter.toLowerCase())), [items, filter]);

  async function onFile(file?: File) {
    if (!file) return;
    const alt = window.prompt("Describe the image (alt text)") ?? "";
    setBusy(true);
    try {
      const m = await uploadImage(file, alt);
      setItems((prev) => [{ id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height }, ...prev]);
      setSelected(m.id);
      setOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={selected} />
      {current ? (
        <div className="overflow-hidden rounded-md border border-slate-200">
          <div className="relative aspect-[16/9] bg-slate-100">
            <SmartImage src={current.url} alt={current.alt} fill sizes="400px" className="object-cover" />
          </div>
          <div className="flex items-center gap-2 p-2">
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500" title={current.alt}>{current.alt || <span className="text-amber-700">No alt text</span>}</p>
            <button type="button" className={adminBtn.ghost} onClick={() => setOpen(true)}>Change</button>
            <button type="button" className={adminBtn.ghost} onClick={() => setSelected("")} aria-label="Remove image"><X className="size-4" /></button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={adminBtn.secondary} onClick={() => setOpen(true)}>Choose from library</button>
          <button type="button" className={adminBtn.secondary} disabled={!uploadsEnabled || busy} onClick={() => fileRef.current?.click()} title={uploadsEnabled ? "" : "Cloudinary not configured"}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept={UPLOAD_MIME_TYPES.join(",")} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Media library">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-t-xl bg-white sm:rounded-xl">
            <div className="flex items-center gap-3 border-b border-slate-200 p-3">
              <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by alt text…" className={adminInput} />
              <button type="button" className={adminBtn.secondary} disabled={!uploadsEnabled || busy} onClick={() => fileRef.current?.click()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
              </button>
              <button type="button" className={adminBtn.ghost} onClick={() => setOpen(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            {shown.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-500">{items.length ? "No images match that filter." : "The media library is empty. Upload an image to get started."}</p>
            )}
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-4 md:grid-cols-5">
              {shown.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => { setSelected(i.id); setOpen(false); }}
                  className={`relative aspect-square overflow-hidden rounded-md bg-slate-100 ring-offset-2 hover:ring-2 hover:ring-blue-400 ${i.id === selected ? "ring-2 ring-blue-600" : ""}`}
                  title={i.alt}
                >
                  <SmartImage src={i.url} alt={i.alt} fill sizes="160px" className="object-cover" />
                </button>
              ))}
              {shown.length === 0 && <p className="col-span-full py-10 text-center text-sm text-slate-500">No images.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
