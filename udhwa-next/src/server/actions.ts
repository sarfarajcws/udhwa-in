"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/json";
import type { ContributionTypeKey } from "@/lib/contribution-types";
import { userApi } from "@/lib/api";
import { formToObject, toActionState } from "./form";

/**
 * Form actions for the public site. Each one forwards to the Udhwa API on
 * behalf of the signed-in visitor; all validation and rules live in the API.
 */

export async function submitContribution(type: ContributionTypeKey, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  let id: string;
  try {
    ({ id } = await (await userApi()).post<{ id: string }>(`/v1/contributions/${type.toLowerCase()}`, values));
  } catch (e) {
    return toActionState(e, values);
  }
  revalidatePath("/account");
  redirect(`/account/contributions/${id}?submitted=1`);
}

export async function resubmitContribution(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  try {
    const r = await (await userApi()).put<{ ok: boolean; message: string }>(`/v1/me/contributions/${id}`, values);
    revalidatePath(`/account/contributions/${id}`);
    return { ok: true, message: r.message };
  } catch (e) {
    return toActionState(e, values);
  }
}

export async function withdrawContribution(id: string): Promise<ActionState> {
  try {
    await (await userApi()).post(`/v1/me/contributions/${id}/withdraw`);
    revalidatePath(`/account/contributions/${id}`);
    revalidatePath("/account");
    return { ok: true };
  } catch (e) {
    return toActionState(e);
  }
}

export async function submitCorrection(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  try {
    const r = await (await userApi()).post<{ ok: boolean; id: string }>("/v1/corrections", values);
    revalidatePath("/account");
    return { ok: true, id: r.id };
  } catch (e) {
    return toActionState(e, values);
  }
}

export async function updateProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  try {
    const r = await (await userApi()).patch<{ ok: boolean; message: string }>("/v1/me/profile", values);
    revalidatePath("/account");
    return { ok: true, message: r.message };
  } catch (e) {
    return toActionState(e, values);
  }
}

export async function sendContactMessage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formToObject(fd);
  try {
    await (await userApi()).post("/v1/contact", values);
    return { ok: true };
  } catch (e) {
    return toActionState(e, values);
  }
}
