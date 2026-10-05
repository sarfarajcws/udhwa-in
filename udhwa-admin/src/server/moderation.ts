"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ModerationResult } from "@/lib/api-client";
import type { CorrectionStatus } from "@/lib/api-contract";
import type { ActionState } from "@/lib/json";
import { adminApi } from "@/lib/api";
import { formToObject, toActionState } from "./form";

/** Review actions — wrappers over /v1/admin/contributions and /v1/admin/corrections. */

export async function moderateContribution(id: string, action: "start" | "request_changes" | "reject" | "approve", _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  let result: ModerationResult;
  try {
    result = await (await adminApi()).post<ModerationResult>(`/v1/admin/contributions/${id}/${action}`, { note: values.note });
  } catch (e) {
    return toActionState(e, values);
  }
  revalidatePath("/", "layout");
  // Approval creates a draft entity — continue editing it.
  if (result.draft) redirect(`${result.draft.href}?fromContribution=1`);
  return { ok: true, ts: Date.now() };
}

export async function updateCorrection(id: string, status: CorrectionStatus, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  try {
    await (await adminApi()).post(`/v1/admin/corrections/${id}`, { status, note: values.note });
    revalidatePath("/", "layout");
    return { ok: true, ts: Date.now() };
  } catch (e) {
    return toActionState(e, values);
  }
}
