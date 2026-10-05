"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { FieldError } from "@/components/ui/field-error";
import type { ActionState } from "@/lib/json";
import { sendContactMessage } from "@/server/actions";

export function ContactForm() {
  const [state, action] = useActionState<ActionState, FormData>(sendContactMessage, {});
  if (state.ok) {
    return (
      <Alert tone="success">
        <p className="font-semibold">Thanks — your message has reached the Udhwa team.</p>
        <p className="mt-1">We’ll reply by email if a response is needed.</p>
      </Alert>
    );
  }
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">Name</label>
          <input id="c-name" name="name" required maxLength={100} autoComplete="name" className="field" aria-invalid={!!fe.name} />
          <FieldError errors={fe.name} />
        </div>
        <div>
          <label htmlFor="c-email" className="label">Email</label>
          <input id="c-email" name="email" type="email" required maxLength={200} autoComplete="email" className="field" aria-invalid={!!fe.email} />
          <FieldError errors={fe.email} />
        </div>
      </div>
      <div>
        <label htmlFor="c-phone" className="label">Phone <span className="font-normal text-muted">(optional)</span></label>
        <input id="c-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="field" />
      </div>
      <div>
        <label htmlFor="c-subject" className="label">Subject</label>
        <input id="c-subject" name="subject" required maxLength={150} className="field" aria-invalid={!!fe.subject} />
        <FieldError errors={fe.subject} />
      </div>
      <div>
        <label htmlFor="c-message" className="label">Message</label>
        <textarea id="c-message" name="message" required rows={6} maxLength={5000} className="field" aria-invalid={!!fe.message} />
        <FieldError errors={fe.message} />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingText="Sending…">Send message</SubmitButton>
    </form>
  );
}
