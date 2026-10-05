"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdminSaveResult } from "@/lib/api-client";
import type { EntityKey } from "@/lib/entities";
import type { ActionState } from "@/lib/json";
import { adminApi } from "@/lib/api";
import { formToObject, toActionState } from "./form";

/** Content actions — thin wrappers over /v1/admin/entities on the Udhwa API. */

export async function saveEntity(key: EntityKey, id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  let result: AdminSaveResult;
  try {
    const api = await adminApi();
    result = id ? await api.put<AdminSaveResult>(`/v1/admin/entities/${key}/${id}`, values) : await api.post<AdminSaveResult>(`/v1/admin/entities/${key}`, values);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath("/", "layout");
  if (result.created) redirect(`/${key}/${result.id}?created=1`);
  return { ok: true, message: result.message, ts: Date.now() };
}

export async function setEntityStatus(key: EntityKey, id: string, transition: "publish" | "unpublish" | "review" | "archive" | "restore"): Promise<ActionState> {
  try {
    await (await adminApi()).post(`/v1/admin/entities/${key}/${id}/status`, { transition });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return toActionState(e);
  }
}

export async function deleteEntity(key: EntityKey, id: string): Promise<ActionState> {
  try {
    await (await adminApi()).delete(`/v1/admin/entities/${key}/${id}`);
  } catch (e) {
    return toActionState(e);
  }
  revalidatePath("/", "layout");
  redirect(`/${key}?deleted=1`);
}
