import type { Metadata } from "next";
import { ogImageUrl } from "@/lib/media-url";
import { absoluteUrl, site } from "@/lib/site";
import { truncate } from "@/lib/utils";

type SeoFields = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean | null;
};

type BuildArgs = {
  title: string;
  description: string;
  path: string;
  image?: { url: string; alt?: string | null; width?: number | null; height?: number | null } | null;
  type?: "website" | "article" | "profile";
  publishedTime?: Date | null;
  modifiedTime?: Date | null;
  authors?: string[];
  seo?: SeoFields;
  locale?: string;
  noIndex?: boolean;
};

/**
 * One place that decides titles, descriptions, canonicals, Open Graph,
 * Twitter cards and robots for every public page. Admin-managed SEO
 * fields override the defaults derived from content.
 */
export function buildMetadata(a: BuildArgs): Metadata {
  const title = a.seo?.seoTitle?.trim() || a.title;
  const description = truncate((a.seo?.seoDescription?.trim() || a.description).replace(/\s+/g, " "), 160);
  const canonical = a.seo?.canonicalUrl?.trim() || absoluteUrl(a.path);
  const noIndex = a.noIndex || a.seo?.noIndex;
  const img = a.image
    ? {
        url: absoluteUrl(ogImageUrl(a.image.url)),
        alt: a.image.alt || title,
        ...(a.image.url.startsWith("https://res.cloudinary.com/") ? { width: 1200, height: 630 } : { width: a.image.width ?? undefined, height: a.image.height ?? undefined }),
      }
    : undefined;

  return {
    title,
    description,
    alternates: { canonical },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: a.type ?? "website",
      title,
      description,
      url: canonical,
      siteName: site.name,
      locale: a.locale ?? site.locale,
      images: img ? [img] : undefined,
      ...(a.type === "article"
        ? {
            publishedTime: a.publishedTime?.toISOString(),
            modifiedTime: a.modifiedTime?.toISOString(),
            authors: a.authors,
          }
        : {}),
    },
    twitter: {
      card: img ? "summary_large_image" : "summary",
      title,
      description,
      images: img ? [img.url] : undefined,
    },
  };
}
