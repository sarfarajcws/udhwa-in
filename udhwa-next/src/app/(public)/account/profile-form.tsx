"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/misc";
import { FieldError } from "@/components/ui/field-error";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfile } from "@/server/actions";
import type { ActionState } from "@/lib/json";

export function ProfileForm({ initial }: { initial: { name: string; username: string; bio: string } }) {
  const [state, action] = useActionState<ActionState, FormData>(updateProfile, {});
  const fe = state.fieldErrors ?? {};
  const val = (k: keyof typeof initial) => (state.values?.[k] as string | undefined) ?? initial[k];
  return (
    <form key={state.ts ?? 0} action={action} className="space-y-4">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      <div>
        <label htmlFor="p-name" className="label">Name</label>
        <input id="p-name" name="name" defaultValue={val("name")} maxLength={80} required className="field" />
        <FieldError errors={fe.name} />
      </div>
      <div>
        <label htmlFor="p-username" className="label">Username <span className="font-normal text-muted">(optional)</span></label>
        <input id="p-username" name="username" defaultValue={val("username")} maxLength={30} className="field" />
        <FieldError errors={fe.username} />
      </div>
      <div>
        <label htmlFor="p-bio" className="label">Short bio <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="p-bio" name="bio" defaultValue={val("bio")} maxLength={280} rows={3} className="field" />
      </div>
      <SubmitButton size="sm">Save profile</SubmitButton>
    </form>
  );
}
