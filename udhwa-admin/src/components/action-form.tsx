"use client";

import { startTransition, useActionState, useRef, type FormEvent, type ReactNode } from "react";
import type { ActionState } from "@/lib/json";
import { adminBtn } from "./ui";

/** Small admin form: no automatic reset on error; optional reset on success. */
export function ActionForm({ action, children, submitLabel = "Save", className, resetOnSuccess = false }: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r.ok && resetOnSuccess) ref.current?.reset();
    return r;
  }, {});
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  }
  const fe = state.fieldErrors ?? {};
  const firstFieldError = Object.entries(fe).find(([, v]) => v?.length);
  return (
    <form ref={ref} onSubmit={onSubmit} className={className}>
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" className={adminBtn.primary} disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
        {state.error && <span className="text-sm text-red-700" role="alert">{state.error}{firstFieldError ? ` (${firstFieldError[0]}: ${firstFieldError[1]![0]})` : ""}</span>}
        {state.ok && state.message && <span className="text-sm text-emerald-700" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
