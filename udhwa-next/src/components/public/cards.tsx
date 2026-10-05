import Link from "next/link";
import { BadgeCheck, Clock, MapPin, User } from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import type { BlogCardData, BusinessCardData, NewsCardData, PhotoCardData, PlaceCardData, ServiceCardData } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";

type Media = { url: string; alt: string; width: number | null; height: number | null } | null;

function Cover({ media, sizes, className, fallback }: { media: Media; sizes: string; className?: string; fallback: string }) {
  if (!media) {
    // No photo yet: a quiet placeholder with the initial, never a stock image.
    return (
      <div className={cn("flex items-center justify-center bg-sunken text-3xl font-bold text-line-strong", className)} aria-hidden>
        {fallback.charAt(0)}
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden bg-sunken", className)}>
      <SmartImage src={media.url} alt={media.alt} fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">{children}</p>;
}

// ── Places ───────────────────────────────────────────────────
export function PlaceCard({ place }: { place: PlaceCardData }) {
  return (
    <article className="group relative">
      <Cover media={place.cover} fallback={place.name} sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw" className="aspect-[4/3] rounded-[var(--radius-card)]" />
      <div className="mt-3">
        {place.category && <p className="eyebrow text-brand-700">{place.category.name}</p>}
        <h3 className="mt-1 text-[17px] leading-snug font-semibold text-ink">
          <Link href={`/places/${place.slug}`} className="after:absolute after:inset-0">
            {place.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{place.summary}</p>
      </div>
    </article>
  );
}

// ── Businesses ───────────────────────────────────────────────
export function BusinessCard({ business }: { business: BusinessCardData }) {
  return (
    <article className="group card relative flex gap-4 p-3 transition-colors hover:border-line-strong">
      <Cover media={business.cover} fallback={business.name} sizes="112px" className="size-24 shrink-0 rounded-lg sm:size-28" />
      <div className="min-w-0 py-1">
        <h3 className="flex items-center gap-1.5 text-[16px] leading-snug font-semibold text-ink">
          <Link href={`/businesses/${business.slug}`} className="after:absolute after:inset-0">
            {business.name}
          </Link>
          {business.verifiedAt && <BadgeCheck className="size-4 shrink-0 text-brand-600" aria-label="Verified by Udhwa" />}
        </h3>
        {business.category && <p className="mt-0.5 text-[13px] font-medium text-amber-700">{business.category.name}</p>}
        <p className="mt-1 line-clamp-2 text-sm text-muted">{business.summary}</p>
        {business.address && (
          <p className="mt-1.5 flex items-start gap-1 text-[13px] text-muted">
            <MapPin className="mt-0.5 size-3.5 shrink-0" /> <span className="line-clamp-1">{business.address}</span>
          </p>
        )}
      </div>
    </article>
  );
}

// ── Services ─────────────────────────────────────────────────
export function ServiceCard({ service }: { service: ServiceCardData }) {
  return (
    <article className="card relative flex flex-col p-5 transition-colors hover:border-line-strong">
      {service.category && <p className="eyebrow">{service.category.name}</p>}
      <h3 className="mt-1.5 text-[17px] leading-snug font-semibold text-ink">
        <Link href={`/services/${service.slug}`} className="after:absolute after:inset-0">
          {service.name}
        </Link>
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-muted">{service.summary}</p>
      <div className="mt-auto space-y-1 pt-4 text-[13px] text-ink-soft">
        <p className="flex items-center gap-1.5">
          <User className="size-3.5 text-muted" /> {service.providerName}
        </p>
        {service.serviceArea && (
          <p className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-muted" /> {service.serviceArea}
          </p>
        )}
      </div>
    </article>
  );
}

// ── News ─────────────────────────────────────────────────────
/** News reads best as a list: date first, headline, short excerpt. */
export function NewsRow({ article, showImage = true }: { article: NewsCardData; showImage?: boolean }) {
  return (
    <article className="group relative flex gap-4 py-5 first:pt-0 last:pb-0" lang={article.language !== "en" ? article.language : undefined}>
      <div className="min-w-0 flex-1">
        <Meta>
          <time dateTime={article.publishedAt?.toISOString()} className="font-medium text-ink-soft">
            {formatDate(article.publishedAt)}
          </time>
          {article.category && <span>{article.category.name}</span>}
        </Meta>
        <h3 className="mt-1.5 text-[17px] leading-snug font-semibold text-ink group-hover:text-brand-700 sm:text-lg">
          <Link href={`/news/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
      </div>
      {showImage && article.cover && (
        <Cover media={article.cover} fallback={article.title} sizes="144px" className="hidden aspect-[4/3] w-36 shrink-0 rounded-lg sm:block" />
      )}
    </article>
  );
}

// ── Blogs ────────────────────────────────────────────────────
export function BlogCard({ post, large = false }: { post: BlogCardData; large?: boolean }) {
  return (
    <article className="group relative" lang={post.language !== "en" ? post.language : undefined}>
      <Cover
        media={post.cover}
        fallback={post.title}
        sizes={large ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 280px, 100vw"}
        className={cn("rounded-[var(--radius-card)]", large ? "aspect-[16/10]" : "aspect-[16/10]")}
      />
      <div className="mt-3">
        {post.category && <p className="eyebrow text-brand-700">{post.category.name}</p>}
        <h3 className={cn("mt-1 leading-snug font-semibold text-ink group-hover:text-brand-700", large ? "text-xl sm:text-2xl" : "text-[17px]")}>
          <Link href={`/blogs/${post.slug}`} className="after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {large && <p className="mt-2 line-clamp-3 text-[15px] text-muted">{post.excerpt}</p>}
        <Meta>
          <span className="mt-2">{post.author?.name ?? "Udhwa"}</span>
          <span className="mt-2 flex items-center gap-1">
            <Clock className="size-3.5" /> {post.readingMinutes} min read
          </span>
        </Meta>
      </div>
    </article>
  );
}

// ── Photos ───────────────────────────────────────────────────
export function PhotoTile({ photo, sizes = "(min-width: 1024px) 380px, 50vw", className }: { photo: PhotoCardData; sizes?: string; className?: string }) {
  return (
    <Link href={`/photos/${photo.id}`} className={cn("group relative block overflow-hidden rounded-[var(--radius-card)] bg-sunken", className)}>
      <SmartImage src={photo.media.url} alt={photo.media.alt} fill sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-10 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {photo.title}
      </span>
    </Link>
  );
}
