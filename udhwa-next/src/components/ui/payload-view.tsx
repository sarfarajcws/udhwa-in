import { SmartImage } from "./smart-image";
import { RichContent } from "./rich-content";

const LABELS: Record<string, string> = {
  name: "Name", title: "Title", summary: "Summary", excerpt: "Summary", categorySlug: "Category", address: "Address", details: "Details",
  sourceUrl: "Source link", sourceName: "Source", phone: "Phone", website: "Website", hours: "Hours", isOwner: "Submitter is the owner",
  providerName: "Provider", providerType: "Provider type", serviceArea: "Area served", availability: "Availability", happenedOn: "Date",
  location: "Location", language: "Language", caption: "Caption", alt: "Alt text", placeSlug: "Place", takenOn: "Date taken", isOwnPhoto: "Own photo / has permission",
};

/** Read-only, escaped rendering of a contribution payload (for contributors and admins). */
export function PayloadView({ type, payload, media = [] }: { type: string; payload: Record<string, unknown>; media?: { id: string; url: string; alt: string; width: number | null; height: number | null }[] }) {
  const entries = Object.entries(payload).filter(([k, v]) => k !== "content" && k !== "mediaId" && v !== undefined && v !== null && v !== "");
  return (
    <div className="space-y-6">
      {media.map((m) => (
        <div key={m.id} className="relative aspect-[16/10] overflow-hidden rounded-lg bg-sunken">
          <SmartImage src={m.url} alt={m.alt} fill sizes="720px" className="object-contain" />
        </div>
      ))}
      <dl className="card divide-y divide-line text-sm">
        {entries.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-muted">{LABELS[k] ?? k}</dt>
            <dd className="break-words whitespace-pre-line text-ink-soft">
              {typeof v === "boolean" ? (v ? "Yes" : "No") : typeof v === "string" && /^https?:\/\//.test(v) ? (
                <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="link">{v}</a>
              ) : (
                String(v)
              )}
            </dd>
          </div>
        ))}
      </dl>
      {type === "BLOG" && Boolean(payload.content) && (
        <div className="card p-5 sm:p-8">
          <RichContent doc={payload.content} />
        </div>
      )}
    </div>
  );
}
