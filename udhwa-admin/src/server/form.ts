import { ApiError } from "@/lib/api-client";
import type { ActionState } from "@/lib/json";

/** FormData → plain object; checkboxes ("on") become true; repeated keys become arrays. */
export function formToObject(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$ACTION")) continue;
    const val = v === "on" ? true : typeof v === "string" ? v : undefined;
    if (val === undefined) continue;
    if (k in out) out[k] = ([] as unknown[]).concat(out[k], val);
    else out[k] = val;
  }
  return out;
}

export function toActionState(e: unknown, values?: Record<string, unknown>): ActionState {
  if (e instanceof ApiError) return { error: e.message, fieldErrors: e.fieldErrors, values, ts: Date.now() };
  if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_")) throw e;
  console.error(e);
  return { error: "Something went wrong. Please try again.", values, ts: Date.now() };
}
