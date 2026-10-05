"use client";

import { useActionState } from "react";
import { Panel, adminBtn, adminInput } from "@/components/ui";
import { moderateContribution } from "@/server/moderation";
import type { ActionState } from "@/lib/json";

type Act = "start" | "request_changes" | "reject" | "approve";

export function ModerationPanel({ id, status }: { id: string; status: string }) {
  // The clicked button's name/value arrives in the FormData (no stale state).
  const [state, formAction, pending] = useActionState<ActionState, FormData>((prev, fd) => moderateContribution(id, (fd.get("act") as Act) ?? "start", prev, fd), {});
  return (
    <Panel title="Review">
      <form action={formAction} className="space-y-3">
        {state.error && <p className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-sm text-red-800" role="alert">{state.error}</p>}
        {state.ok && <p className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-sm text-emerald-800">Updated.</p>}
        <label htmlFor="mod-note" className="block text-sm font-medium text-slate-700">Note to contributor</label>
        <textarea id="mod-note" name="note" rows={4} maxLength={2000} className={adminInput} placeholder="Required when requesting changes or declining. Shown to the contributor." />
        <div className="flex flex-col gap-2">
          <button type="submit" name="act" value="approve" disabled={pending} className={adminBtn.primary + " justify-center"}>Approve → create draft</button>
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" name="act" value="request_changes" disabled={pending} className={adminBtn.secondary + " justify-center"}>Request changes</button>
            <button type="submit" name="act" value="reject" disabled={pending} className={adminBtn.danger + " justify-center"}>Decline</button>
          </div>
          {status === "SUBMITTED" && (
            <button type="submit" name="act" value="start" disabled={pending} className={adminBtn.ghost + " justify-center"}>Mark as under review</button>
          )}
        </div>
        <p className="text-xs text-slate-500">Approving creates an unpublished draft you can edit, verify and then publish.</p>
      </form>
    </Panel>
  );
}
