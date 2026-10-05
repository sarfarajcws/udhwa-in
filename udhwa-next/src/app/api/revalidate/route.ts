import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

/**
 * Webhook called by the Udhwa API whenever published content changes.
 * Expires every cached page/API response tagged "content", so the next
 * visit renders fresh data.
 */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? "";
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && t.length < 100).slice(0, 20) : ["content"];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags, now: Date.now() });
}
