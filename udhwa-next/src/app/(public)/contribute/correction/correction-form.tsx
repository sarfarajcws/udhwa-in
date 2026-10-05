"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/misc";
import { FieldError } from "@/components/ui/field-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitCorrection } from "@/server/actions";
import type { ActionState } from "@/lib/json";

const KINDS = [
  { value: "CORRECTION", label: "Something is wrong", hint: "A mistake in the information on the page." },
  { value: "UPDATE", label: "Something has changed", hint: "New phone number, new timings, moved, closed…" },
  { value: "OWNERSHIP_CLAIM", label: "I own or run this business", hint: "Send updates as the owner. The team will verify you before acting on it." },
];

export function CorrectionForm({ target, id, defaultKind, backHref }: { target: string; id: string; defaultKind: string; backHref: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitCorrection, {});
  const [kind, setKind] = useState(defaultKind);
  const fe = state.fieldErrors ?? {};
  const val = (k: string) => (state.values?.[k] as string | undefined) ?? "";

  if (state.ok) {
    return (
      <Alert tone="success">
        <p className="font-semibold">Thank you — the Udhwa team will review this.</p>
        <p className="mt-1">
          You can follow its status from <Link href="/account" className="underline">your profile</Link>, or go <Link href={backHref} className="underline">back to the page</Link>.
        </p>
      </Alert>
    );
  }

  return (
    <form key={state.ts ?? 0} action={action} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="label">What kind of change?</legend>
        <div className="space-y-2">
          {KINDS.filter((k) => k.value !== "OWNERSHIP_CLAIM" || target === "business").map((k) => (
            <label key={k.value} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50/50">
              <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="mt-1 accent-brand-600" />
              <span>
                <span className="block text-sm font-semibold text-ink">{k.label}</span>
                <span className="block text-sm text-muted">{k.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError errors={fe.kind} />
      </fieldset>
      <div>
        <label htmlFor="k-message" className="label">{kind === "OWNERSHIP_CLAIM" ? "Tell us about your connection to the business" : "What’s wrong or what has changed?"}</label>
        <textarea id="k-message" name="message" defaultValue={val("message")} rows={5} maxLength={2000} required className="field" aria-invalid={!!fe.message} />
        <FieldError errors={fe.message} />
      </div>
      <div>
        <label htmlFor="k-suggested" className="label">Correct information <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="k-suggested" name="suggestedChange" defaultValue={val("suggestedChange")} rows={3} maxLength={2000} className="field" placeholder="e.g. Phone: +91 …, Open 8 AM – 9 PM" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="k-evidence" className="label">Source / proof link <span className="font-normal text-muted">(optional)</span></label>
          <input id="k-evidence" name="evidenceUrl" defaultValue={val("evidenceUrl")} type="url" maxLength={500} className="field" aria-invalid={!!fe.evidenceUrl} />
          <FieldError errors={fe.evidenceUrl} />
        </div>
        <div>
          <label htmlFor="k-phone" className="label">Phone for verification {kind !== "OWNERSHIP_CLAIM" && <span className="font-normal text-muted">(optional)</span>}</label>
          <input id="k-phone" name="contactPhone" defaultValue={val("contactPhone")} type="tel" maxLength={30} className="field" aria-invalid={!!fe.contactPhone} />
          <p className="hint">Only the Udhwa team sees this.</p>
          <FieldError errors={fe.contactPhone} />
        </div>
      </div>
      <SubmitButton pendingText="Sending…">Send to the Udhwa team</SubmitButton>
    </form>
  );
}
