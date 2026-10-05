import "server-only";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { findRedirect } from "./queries";

/** Called when a slug isn't found: follow a stored redirect, else 404. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const r = await findRedirect(path).catch(() => null);
  if (r) {
    if (r.permanent) permanentRedirect(r.toPath);
    redirect(r.toPath);
  }
  notFound();
}
