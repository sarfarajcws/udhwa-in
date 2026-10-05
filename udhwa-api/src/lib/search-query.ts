/** Pure helper (no DB) so it can be unit-tested. */
/** Builds a safe prefix tsquery string from free text, e.g. "udhwa lake" → "udhwa:* & lake:*". */
export function toTsQuery(input: string) {
  const terms = input
    .normalize("NFC")
    .split(/[^\p{L}\p{N}\p{M}]+/u)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  return terms.length ? terms.map((t) => `${t}:*`).join(" & ") : null;
}

export type SearchKind = "place" | "business" | "service" | "news" | "blog" | "photo";

export const SEARCH_KINDS: { kind: SearchKind; label: string }[] = [
  { kind: "place", label: "Places" },
  { kind: "business", label: "Businesses" },
  { kind: "service", label: "Services" },
  { kind: "news", label: "News" },
  { kind: "blog", label: "Blogs" },
  { kind: "photo", label: "Photos" },
];

export function hitHref(h: { kind: SearchKind; slug: string | null; id: string }) {
  switch (h.kind) {
    case "place":
      return `/places/${h.slug}`;
    case "business":
      return `/businesses/${h.slug}`;
    case "service":
      return `/services/${h.slug}`;
    case "news":
      return `/news/${h.slug}`;
    case "blog":
      return `/blogs/${h.slug}`;
    case "photo":
      return `/photos/${h.id}`;
  }
}
