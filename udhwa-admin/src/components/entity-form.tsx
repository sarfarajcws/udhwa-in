"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ENTITIES, type EntityKey, type FieldDef } from "@/lib/entities";
import type { LibraryItem, OptionMap } from "@/lib/api-client";
import type { ActionState } from "@/lib/json";
import { cn } from "@/lib/utils";
import { adminBtn, adminInput, adminLabel } from "./ui";
import { HoursEditor } from "./hours-editor";
import { MediaPicker } from "./media-picker";

type Values = Record<string, unknown>;

/**
 * Registry-driven content editor used for every content type.
 * Validation happens server-side (lib/admin/parse.ts); this is UX only.
 */
export function EntityForm({
  entity, action, initial, options, library, uploadsEnabled, verified, isNew, status, siteUrl,
}: {
  entity: EntityKey;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initial: Values;
  options: OptionMap;
  library: LibraryItem[];
  uploadsEnabled: boolean;
  verified?: boolean;
  isNew: boolean;
  status?: string;
  siteUrl: string;
}) {
  const def = ENTITIES[entity];
  const [state, formAction, pending] = useActionState(action, {});
  const [seoTitle, setSeoTitle] = useState(String(initial.seoTitle ?? ""));
  const [seoDesc, setSeoDesc] = useState(String(initial.seoDescription ?? ""));
  const [title, setTitle] = useState(String(initial[def.titleField] ?? ""));
  const [summary, setSummary] = useState(String(initial.summary ?? initial.excerpt ?? ""));
  const [slug, setSlug] = useState(String(initial.slug ?? ""));
  const fe = state.fieldErrors ?? {};

  // Submit without React's automatic form reset, so edits survive validation errors.
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => formAction(fd));
  }

  const byGroup = (g: FieldDef["group"]) => def.fields.filter((f) => f.group === g);

  function field(f: FieldDef) {
    const id = `ef-${f.name}`;
    const err = fe[f.name]?.[0];
    const val = initial[f.name];
    const common = { id, name: f.name, "aria-invalid": !!err, className: adminInput };
    let input: React.ReactNode;
    switch (f.type) {
      case "rich":
        input = <RichTextEditor name={f.name} initialContent={val ?? undefined} uploadsEnabled={uploadsEnabled} placeholder={`${f.label}…`} />;
        break;
      case "textarea":
        input = (
          <textarea
            {...common}
            rows={f.group === "seo" ? 2 : 3}
            maxLength={f.max}
            defaultValue={String(val ?? "")}
            onChange={f.name === "seoDescription" ? (e) => setSeoDesc(e.target.value) : f.name === "summary" || f.name === "excerpt" ? (e) => setSummary(e.target.value) : undefined}
          />
        );
        break;
      case "list":
        input = <textarea {...common} rows={4} defaultValue={String(val ?? "")} />;
        break;
      case "checkbox":
        return (
          <label key={f.name} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name={f.name} defaultChecked={Boolean(val)} className="size-4 accent-blue-600" /> {f.label}
          </label>
        );
      case "select": {
        const opts = Array.isArray(f.options) ? f.options : (options[f.options as keyof OptionMap] ?? []);
        input = (
          <select {...common} defaultValue={String(val ?? "")}>
            {!f.required && <option value="">—</option>}
            {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        );
        break;
      }
      case "media":
        input = <MediaPicker name={f.name} initialId={String(val ?? "")} library={library} uploadsEnabled={uploadsEnabled} />;
        break;
      case "hours":
        input = <HoursEditor name={f.name} initial={String(val ?? "")} />;
        break;
      case "datetime":
        input = <input {...common} type="datetime-local" defaultValue={String(val ?? "")} />;
        break;
      case "number":
        input = <input {...common} type="number" step="any" defaultValue={String(val ?? "")} placeholder={f.placeholder} />;
        break;
      case "slug":
        input = (
          <div className="flex items-stretch overflow-hidden rounded-md border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100">
            <span className="flex items-center bg-slate-50 px-2 text-xs text-slate-500">{def.publicBase}/</span>
            <input id={id} name={f.name} defaultValue={String(val ?? "")} onChange={(e) => setSlug(e.target.value)} className="min-w-0 flex-1 px-2 py-2 text-sm outline-none" placeholder="generated from the title" />
          </div>
        );
        break;
      default:
        input = (
          <input
            {...common}
            type={f.type === "url" ? "url" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
            maxLength={f.max}
            defaultValue={String(val ?? "")}
            placeholder={f.placeholder}
            onChange={f.name === "seoTitle" ? (e) => setSeoTitle(e.target.value) : f.name === def.titleField ? (e) => setTitle(e.target.value) : undefined}
          />
        );
    }
    return (
      <div key={f.name} className={cn(f.half ? "sm:col-span-1" : "sm:col-span-2")}>
        <label htmlFor={id} className={adminLabel}>
          {f.label} {f.required && <span className="text-red-600">*</span>}
        </label>
        {input}
        {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
        {err && <p className="mt-1 text-xs font-medium text-red-700" role="alert">{err}</p>}
      </div>
    );
  }

  const grid = (fields: FieldDef[]) => <div className="grid gap-4 sm:grid-cols-2">{fields.map(field)}</div>;
  const shownTitle = seoTitle || title || "Untitled";
  const shownDesc = (seoDesc || summary || "").slice(0, 160);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-6">
        {state.error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{state.error}</p>}
        {state.ok && state.message && <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{state.message}</p>}
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">{grid(byGroup("main"))}</section>
        {byGroup("details").length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-semibold">Details</h2>
            {grid(byGroup("details"))}
          </section>
        )}
        {def.hasSeo && (
          <details className="group rounded-lg border border-slate-200 bg-white" open={Boolean(initial.seoTitle || initial.seoDescription || initial.noIndex || initial.canonicalUrl)}>
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold sm:px-5">SEO <span className="text-sm font-normal text-slate-500">— search appearance</span></summary>
            <div className="space-y-4 border-t border-slate-200 p-4 sm:p-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3" aria-label="Search result preview">
                <p className="truncate text-xs text-emerald-800">{siteUrl}{def.publicBase}/{slug || "…"}</p>
                <p className="truncate text-[17px] text-blue-800">{shownTitle} · Udhwa</p>
                <p className="line-clamp-2 text-[13px] text-slate-600">{shownDesc || "Add a summary or meta description."}</p>
              </div>
              {grid(byGroup("seo"))}
            </div>
          </details>
        )}
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Publishing</h2>
          <p className="mt-1 text-sm text-slate-500">Status: <span className="font-medium text-slate-800">{isNew ? "New" : status}</span></p>
          <div className="mt-4 space-y-3">{byGroup("publishing").map(field)}</div>
          {def.hasVerify && (
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="verified" defaultChecked={verified} className="size-4 accent-blue-600" /> Information verified by the team
            </label>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" name="intent" value="save" className={adminBtn.secondary} disabled={pending}>
              {pending ? "Saving…" : isNew ? "Save draft" : "Save"}
            </button>
            {status !== "Published" && (
              <button type="submit" name="intent" value="publish" className={adminBtn.primary} disabled={pending}>
                Save & publish
              </button>
            )}
          </div>
        </section>
        {byGroup("relations").length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-semibold">Connections</h2>
            {grid(byGroup("relations"))}
          </section>
        )}
      </aside>
    </form>
  );
}
