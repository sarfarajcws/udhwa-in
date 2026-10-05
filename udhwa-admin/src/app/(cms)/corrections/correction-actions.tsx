"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminBtn, adminInput } from "@/components/ui";
import { updateCorrection } from "@/server/moderation";
import type { ActionState } from "@/lib/json";
import type { CorrectionStatus } from "@/lib/api-contract";

export function CorrectionActions({ id, status, editHref }: { id: string; status: CorrectionStatus; editHref: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>((p, fd) => updateCorrection(id, (fd.get("next") as CorrectionStatus) ?? "RESOLVED", p, fd), {});
  return (
    <form action={action} className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
      <input name="note" placeholder="Note for the reporter (optional)" maxLength={2000} className={adminInput + " sm:flex-1"} aria-label="Resolution note" />
      <div className="flex flex-wrap gap-2">
        <Link href={editHref} className={adminBtn.secondary}>Edit content</Link>
        {status === "OPEN" && <button type="submit" name="next" value="IN_REVIEW" disabled={pending} className={adminBtn.ghost}>In review</button>}
        <button type="submit" name="next" value="RESOLVED" disabled={pending} className={adminBtn.primary}>Resolve</button>
        <button type="submit" name="next" value="DISMISSED" disabled={pending} className={adminBtn.danger}>Dismiss</button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
