import { env, webInternalUrl } from "../env";

/**
 * Tells the public website that published content changed, so its cached
 * pages and API responses (tagged "content") are refreshed. Fire-and-forget:
 * a failed webhook only means pages update after their normal revalidate
 * window (5 minutes).
 */
export function revalidateWeb(reason: string) {
  if (!env.REVALIDATE_SECRET) return;
  void fetch(`${webInternalUrl}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.REVALIDATE_SECRET}` },
    body: JSON.stringify({ tags: ["content"], reason }),
    signal: AbortSignal.timeout(5000),
  }).then(
    (r) => { if (!r.ok) console.warn(`[revalidate] web responded ${r.status}`); },
    (e) => console.warn(`[revalidate] could not reach web: ${e instanceof Error ? e.message : e}`),
  );
}
