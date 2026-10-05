"use server";

import { revalidatePath } from "next/cache";
import type { MessageStatus } from "@/lib/api-contract";
import type { ActionState } from "@/lib/json";
import { adminApi } from "@/lib/api";
import { formToObject, toActionState } from "./form";

/** Taxonomy, media, users, messages and redirects — wrappers over /v1/admin/*. */

type Method = "post" | "put" | "delete";

async function call(method: Method, path: string, values?: Record<string, unknown>): Promise<ActionState> {
  try {
    const api = await adminApi();
    const r = (method === "delete" ? await api.delete(path) : await api[method](path, values ?? {})) as { message?: string };
    revalidatePath("/", "layout");
    return { ok: true, message: r?.message, ts: Date.now() };
  } catch (e) {
    return toActionState(e, values);
  }
}

const form = (method: Method, path: string, fd: FormData) => call(method, path, formToObject(fd));

export async function saveCategory(id: string | null, _p: ActionState, fd: FormData) {
  return form(id ? "put" : "post", id ? `/v1/admin/categories/${id}` : "/v1/admin/categories", fd);
}
export async function deleteCategory(id: string) {
  return call("delete", `/v1/admin/categories/${id}`);
}
export async function renameTag(id: string, _p: ActionState, fd: FormData) {
  return form("put", `/v1/admin/tags/${id}`, fd);
}
export async function deleteTag(id: string) {
  return call("delete", `/v1/admin/tags/${id}`);
}
export async function saveAuthor(id: string | null, _p: ActionState, fd: FormData) {
  return form(id ? "put" : "post", id ? `/v1/admin/authors/${id}` : "/v1/admin/authors", fd);
}
export async function saveLocality(id: string | null, _p: ActionState, fd: FormData) {
  return form(id ? "put" : "post", id ? `/v1/admin/localities/${id}` : "/v1/admin/localities", fd);
}
export async function updateMedia(id: string, _p: ActionState, fd: FormData) {
  return form("put", `/v1/admin/media/${id}`, fd);
}
export async function deleteMedia(id: string) {
  return call("delete", `/v1/admin/media/${id}`);
}
export async function setUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
  return call("post", `/v1/admin/users/${userId}/status`, { status });
}
export async function setMessageStatus(id: string, status: MessageStatus) {
  return call("post", `/v1/admin/messages/${id}/status`, { status });
}
export async function saveRedirect(_p: ActionState, fd: FormData) {
  return form("post", "/v1/admin/redirects", fd);
}
export async function deleteRedirect(id: string) {
  return call("delete", `/v1/admin/redirects/${id}`);
}
