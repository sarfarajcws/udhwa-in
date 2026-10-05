import type { Area } from "@/lib/api-contract";
import { ogImageUrl } from "@/lib/media-url";
import { absoluteUrl, site } from "@/lib/site";

/**
 * Schema.org builders. Each one only emits properties we actually have,
 * so structured data always reflects what is on the page.
 */

type Img = { url: string } | null | undefined;
const img = (m: Img) => (m ? absoluteUrl(ogImageUrl(m.url)) : undefined);

function clean<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length))) as T;
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: site.name,
    url: site.url,
    logo: absoluteUrl("/apple-touch-icon.png"),
    email: site.contactEmail,
    founder: { "@type": "Person", name: site.founder },
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: site.name,
    url: site.url,
    description: site.description,
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}

export function articleLd(a: {
  kind: "NewsArticle" | "BlogPosting";
  title: string;
  description: string;
  path: string;
  image?: Img;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  author?: { name: string; slug: string } | null;
  language?: string;
  section?: string | null;
  keywords?: string[];
}) {
  return clean({
    "@context": "https://schema.org",
    "@type": a.kind,
    headline: a.title.slice(0, 110),
    description: a.description,
    mainEntityOfPage: absoluteUrl(a.path),
    url: absoluteUrl(a.path),
    image: img(a.image) ? [img(a.image)] : undefined,
    datePublished: a.publishedAt?.toISOString(),
    dateModified: (a.updatedAt ?? a.publishedAt)?.toISOString(),
    inLanguage: a.language,
    articleSection: a.section ?? undefined,
    keywords: a.keywords?.join(", "),
    author: a.author
      ? { "@type": a.author.slug === "udhwa-desk" ? "Organization" : "Person", name: a.author.name, url: absoluteUrl(`/authors/${a.author.slug}`) }
      : { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, logo: { "@type": "ImageObject", url: absoluteUrl("/apple-touch-icon.png") } },
  });
}

/**
 * PostalAddress from the entity's own data: its street address plus the
 * locality tree it belongs to (locality → district → state → country).
 * Nothing is assumed: missing parts are simply left out.
 */
export function postal(address?: string | null, area?: Area | null) {
  if (!address && !area?.locality) return undefined;
  return clean({
    "@type": "PostalAddress",
    streetAddress: address ?? undefined,
    addressLocality: area?.locality ?? undefined,
    addressRegion: area?.region ?? undefined,
    addressCountry: area?.country ?? undefined,
  });
}

function geo(lat?: number | null, lng?: number | null) {
  return lat != null && lng != null ? { "@type": "GeoCoordinates", latitude: lat, longitude: lng } : undefined;
}

export function placeLd(p: { name: string; summary: string; path: string; image?: Img; address?: string | null; area?: Area | null; lat?: number | null; lng?: number | null; kind?: string }) {
  return clean({
    "@context": "https://schema.org",
    "@type": p.kind ?? "Place",
    name: p.name,
    description: p.summary,
    url: absoluteUrl(p.path),
    image: img(p.image),
    address: postal(p.address, p.area),
    geo: geo(p.lat, p.lng),
    containedInPlace: p.area?.locality ? { "@type": "Place", name: [p.area.locality, p.area.district, p.area.region].filter(Boolean).join(", ") } : undefined,
  });
}

export type Hours = { days: string[]; opens: string; closes: string }[];

const DAY_URI: Record<string, string> = { Mo: "Monday", Tu: "Tuesday", We: "Wednesday", Th: "Thursday", Fr: "Friday", Sa: "Saturday", Su: "Sunday" };

export function localBusinessLd(b: {
  name: string;
  summary: string;
  path: string;
  image?: Img;
  address?: string | null;
  area?: Area | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  hours?: Hours | null;
  type?: string;
}) {
  return clean({
    "@context": "https://schema.org",
    "@type": b.type ?? "LocalBusiness",
    name: b.name,
    description: b.summary,
    url: absoluteUrl(b.path),
    image: img(b.image),
    telephone: b.phone ?? undefined,
    email: b.email ?? undefined,
    sameAs: b.website ? [b.website] : undefined,
    address: postal(b.address, b.area),
    geo: geo(b.lat, b.lng),
    openingHoursSpecification: b.hours?.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => `https://schema.org/${DAY_URI[d] ?? d}`),
      opens: h.opens,
      closes: h.closes,
    })),
  });
}

/** Maps our business categories to the most specific accurate schema type. */
export function businessSchemaType(categorySlug?: string | null) {
  switch (categorySlug) {
    case "restaurant":
      return "Restaurant";
    case "shop":
      return "Store";
    case "fuel":
      return "GasStation";
    default:
      return "LocalBusiness";
  }
}

export function serviceLd(s: {
  name: string;
  summary: string;
  path: string;
  image?: Img;
  providerName: string;
  providerType: "INDIVIDUAL" | "BUSINESS";
  providerPath?: string | null;
  serviceArea?: string | null;
  area?: Area | null;
  phone?: string | null;
  category?: string | null;
}) {
  // Area served: the admin-entered text, else the locality the service belongs to.
  const served = s.serviceArea || [s.area?.locality, s.area?.district, s.area?.region].filter(Boolean).join(", ") || undefined;
  return clean({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.summary,
    url: absoluteUrl(s.path),
    image: img(s.image),
    serviceType: s.category ?? undefined,
    areaServed: served ? { "@type": "Place", name: served } : undefined,
    provider: clean({
      "@type": s.providerType === "BUSINESS" || s.providerPath ? "LocalBusiness" : "Person",
      name: s.providerName,
      url: s.providerPath ? absoluteUrl(s.providerPath) : undefined,
      telephone: s.phone ?? undefined,
    }),
  });
}

export function imageLd(p: {
  title: string;
  caption?: string | null;
  path: string;
  url: string;
  width?: number | null;
  height?: number | null;
  credit?: string | null;
  creator?: string | null;
  publishedAt?: Date | null;
  location?: { name: string; path: string } | null;
}) {
  return clean({
    "@context": "https://schema.org",
    "@type": "ImageObject",
    name: p.title,
    caption: p.caption ?? undefined,
    contentUrl: absoluteUrl(p.url),
    url: absoluteUrl(p.path),
    width: p.width ?? undefined,
    height: p.height ?? undefined,
    creditText: p.credit ?? undefined,
    creator: p.creator ? { "@type": "Person", name: p.creator } : undefined,
    datePublished: p.publishedAt?.toISOString(),
    contentLocation: p.location ? { "@type": "Place", name: p.location.name, url: absoluteUrl(p.location.path) } : undefined,
  });
}

/** Safe JSON-LD serialisation (prevents `</script>` breakouts). */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
