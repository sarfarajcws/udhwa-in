"use client";

import { useActionState, useState } from "react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Alert } from "@/components/ui/misc";
import { FieldError } from "@/components/ui/field-error";
import { ImageUploadField, type UploadedMedia } from "@/components/ui/image-upload";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/json";
import type { ContributionTypeKey } from "@/lib/contribution-types";

type Option = { slug: string; name: string };

function parseDoc(v: unknown) {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
}
type Values = Record<string, unknown>;

export function ContributionForm({
  type, action, categories = [], places = [], initial, uploadsEnabled, submitLabel = "Send for review", initialMedia,
}: {
  type: ContributionTypeKey;
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  categories?: Option[];
  places?: Option[];
  initial?: Values;
  uploadsEnabled: boolean;
  submitLabel?: string;
  initialMedia?: { id: string; url: string; width: number | null; height: number | null; alt: string } | null;
}) {
  const [state, formAction] = useActionState(action, {});
  const values = state.values ?? initial;
  // Kept outside the keyed <form> so an uploaded photo survives a failed submit.
  const [photo, setPhoto] = useState<UploadedMedia | null>(null);
  const [providerType, setProviderType] = useState(String(initial?.providerType ?? "INDIVIDUAL"));
  const fe = state.fieldErrors ?? {};
  const v = (k: string) => (values?.[k] as string | undefined) ?? "";

  const text = (name: string, label: string, opts: { required?: boolean; hint?: string; max?: number; type?: string; placeholder?: string } = {}) => (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label} {!opts.required && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <input id={`f-${name}`} name={name} type={opts.type ?? "text"} defaultValue={v(name)} required={opts.required} maxLength={opts.max ?? 200} placeholder={opts.placeholder} className="field" aria-invalid={!!fe[name]} aria-describedby={opts.hint ? `h-${name}` : undefined} />
      {opts.hint && <p id={`h-${name}`} className="hint">{opts.hint}</p>}
      <FieldError errors={fe[name]} />
    </div>
  );
  const area = (name: string, label: string, opts: { required?: boolean; hint?: string; max?: number; rows?: number } = {}) => (
    <div>
      <label htmlFor={`f-${name}`} className="label">
        {label} {!opts.required && <span className="font-normal text-muted">(optional)</span>}
      </label>
      <textarea id={`f-${name}`} name={name} defaultValue={v(name)} required={opts.required} maxLength={opts.max ?? 4000} rows={opts.rows ?? 4} className="field" aria-invalid={!!fe[name]} />
      {opts.hint && <p className="hint">{opts.hint}</p>}
      <FieldError errors={fe[name]} />
    </div>
  );
  const category = categories.length > 0 && (
    <div>
      <label htmlFor="f-categorySlug" className="label">Category <span className="font-normal text-muted">(optional)</span></label>
      <select id="f-categorySlug" name="categorySlug" defaultValue={v("categorySlug")} className="field">
        <option value="">Not sure</option>
        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </select>
    </div>
  );

  return (
    <form key={state.ts ?? 0} action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && state.message && <Alert tone="success">{state.message}</Alert>}

      {type === "PLACE" && (
        <>
          {text("name", "Name of the place", { required: true, max: 120, placeholder: "e.g. Udhwa Block Office" })}
          {area("summary", "Short description", { required: true, max: 300, rows: 2, hint: "One or two sentences — what is it and why would someone go there?" })}
          {category}
          {text("address", "Address or location", { max: 250 })}
          {area("details", "Anything else worth knowing", { hint: "History, timings, how to get there…" })}
          {text("sourceUrl", "Source link", { type: "url", max: 500, hint: "A website or official page that confirms this, if you have one." })}
        </>
      )}

      {type === "BUSINESS" && (
        <>
          {text("name", "Business name", { required: true, max: 120 })}
          {area("summary", "What do they do?", { required: true, max: 300, rows: 2 })}
          {category}
          {text("address", "Address", { required: true, max: 250, placeholder: "Street, landmark, village" })}
          <div className="grid gap-6 sm:grid-cols-2">
            {text("phone", "Phone", { type: "tel", max: 30 })}
            {text("website", "Website", { type: "url", max: 500 })}
          </div>
          {text("hours", "Opening hours", { max: 200, placeholder: "e.g. 8 AM – 9 PM, daily" })}
          {area("details", "More details")}
          <label className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3 text-sm text-ink-soft">
            <input type="checkbox" name="isOwner" defaultChecked={Boolean(values?.isOwner)} className="mt-0.5 size-4 accent-brand-600" />
            <span>I own or run this business. <span className="text-muted">The team may contact you to verify.</span></span>
          </label>
        </>
      )}

      {type === "SERVICE" && (
        <>
          {text("name", "Service", { required: true, max: 120, placeholder: "e.g. AC repair" })}
          {area("summary", "Short description", { required: true, max: 300, rows: 2 })}
          {category}
          <fieldset>
            <legend className="label">Provided by</legend>
            <div className="flex gap-4 text-sm">
              {(["INDIVIDUAL", "BUSINESS"] as const).map((p) => (
                <label key={p} className="flex items-center gap-2">
                  <input type="radio" name="providerType" value={p} checked={providerType === p} onChange={() => setProviderType(p)} className="accent-brand-600" />
                  {p === "INDIVIDUAL" ? "An individual" : "A business"}
                </label>
              ))}
            </div>
          </fieldset>
          {text("providerName", providerType === "BUSINESS" ? "Business name" : "Provider’s name", { required: true, max: 120 })}
          <div className="grid gap-6 sm:grid-cols-2">
            {text("serviceArea", "Area served", { max: 150, placeholder: "e.g. Udhwa and nearby villages" })}
            {text("availability", "Availability", { max: 150, placeholder: "e.g. 9 AM – 7 PM, Mon–Sat" })}
          </div>
          {text("phone", "Contact phone", { type: "tel", max: 30, hint: "Only share a number with the provider’s permission." })}
          {area("details", "More details")}
        </>
      )}

      {type === "NEWS" && (
        <>
          {text("title", "Headline", { required: true, max: 200 })}
          {area("summary", "In one or two sentences, what happened?", { required: true, max: 400, rows: 2 })}
          {area("details", "Full details", { required: true, max: 8000, rows: 8, hint: "Who, what, where, when. Stick to what you know — the team will verify before publishing." })}
          <div className="grid gap-6 sm:grid-cols-2">
            {text("happenedOn", "Date", { type: "date", max: 20 })}
            {text("location", "Where", { max: 200 })}
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {text("sourceName", "Source", { max: 200, placeholder: "e.g. School notice, eyewitness" })}
            {text("sourceUrl", "Source link", { type: "url", max: 500 })}
          </div>
        </>
      )}

      {type === "BLOG" && (
        <>
          {text("title", "Title", { required: true, max: 200 })}
          {area("excerpt", "Summary", { required: true, max: 400, rows: 2, hint: "Shown in listings and search results." })}
          <div>
            <label htmlFor="f-language" className="label">Language</label>
            <select id="f-language" name="language" defaultValue={v("language") || "en"} className="field max-w-xs">
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="hi-Latn">Hinglish</option>
            </select>
          </div>
          <div>
            <span className="label">Your article</span>
            <RichTextEditor name="content" initialContent={parseDoc(values?.content)} variant="basic" uploadsEnabled={uploadsEnabled} placeholder="Write your article…" />
            <FieldError errors={fe.content} />
          </div>
        </>
      )}

      {type === "PHOTO" && (
        <>
          {!initialMedia && <ImageUploadField name="mediaId" enabled={uploadsEnabled} label="Photo" initial={photo} onChange={setPhoto} />}
          <FieldError errors={fe.mediaId} />
          {text("title", "Title", { required: true, max: 150 })}
          {text("alt", "Describe what’s in the photo", { required: true, max: 300, hint: "Used as alt text for people who can’t see the image." })}
          {area("caption", "Caption", { max: 500, rows: 2 })}
          <div className="grid gap-6 sm:grid-cols-2">
            {places.length > 0 && (
              <div>
                <label htmlFor="f-placeSlug" className="label">Place <span className="font-normal text-muted">(optional)</span></label>
                <select id="f-placeSlug" name="placeSlug" defaultValue={v("placeSlug")} className="field">
                  <option value="">—</option>
                  {places.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
                </select>
              </div>
            )}
            {text("takenOn", "Date taken", { type: "date", max: 20 })}
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3 text-sm text-ink-soft">
            <input type="checkbox" name="isOwnPhoto" defaultChecked={Boolean(values?.isOwnPhoto)} className="mt-0.5 size-4 accent-brand-600" />
            <span>I took this photo, or I have permission to share it on Udhwa.</span>
          </label>
          <FieldError errors={fe.isOwnPhoto} />
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">The Udhwa team reviews every submission before anything is published.</p>
        <SubmitButton pendingText="Sending…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
