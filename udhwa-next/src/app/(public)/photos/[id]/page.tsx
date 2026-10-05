import Link from "next/link";
import { notFound } from "next/navigation";
import { TrustNote } from "@/components/public/blocks";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { breadcrumbLd, imageLd } from "@/lib/jsonld";
import { getPhoto } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

/**
 * Rendered on first visit, then cached (ISR) until the API reports a content
 * change via /api/revalidate — so builds never depend on the API being up.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/photos/[id]">) {
  const { id } = await params;
  const photo = await getPhoto(id);
  if (!photo) return {};
  return buildMetadata({
    title: photo.title,
    description: photo.caption || photo.media.alt || photo.title,
    path: `/photos/${photo.id}`,
    image: photo.media,
  });
}

export default async function PhotoPage({ params }: PageProps<"/photos/[id]">) {
  const { id } = await params;
  const photo = await getPhoto(id);
  if (!photo) notFound();
  const path = `/photos/${photo.id}`;
  const links = [
    photo.place && { href: `/places/${photo.place.slug}`, label: photo.place.name, kind: "Place" },
    photo.business && { href: `/businesses/${photo.business.slug}`, label: photo.business.name, kind: "Business" },
    photo.service && { href: `/services/${photo.service.slug}`, label: photo.service.name, kind: "Service" },
    photo.blog && { href: `/blogs/${photo.blog.slug}`, label: photo.blog.title, kind: "Blog" },
    photo.news && { href: `/news/${photo.news.slug}`, label: photo.news.title, kind: "News" },
  ].filter(Boolean) as { href: string; label: string; kind: string }[];

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          imageLd({
            title: photo.title, caption: photo.caption, path, url: photo.media.url, width: photo.media.width, height: photo.media.height,
            credit: photo.credit, creator: photo.contributor?.name, publishedAt: photo.publishedAt,
            location: photo.place ? { name: photo.place.name, path: `/places/${photo.place.slug}` } : null,
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Photos", path: "/photos" },
            ...(photo.category ? [{ name: photo.category.name, path: `/photos?category=${photo.category.slug}` }] : []),
            { name: photo.title, path },
          ]),
        ]}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Photos", href: "/photos" },
          ...(photo.category ? [{ name: photo.category.name, href: `/photos?category=${photo.category.slug}` }] : []),
          { name: photo.title },
        ]}
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <figure className="overflow-hidden rounded-2xl bg-ink">
          <SmartImage
            src={photo.media.url}
            alt={photo.media.alt}
            width={photo.media.width ?? 1600}
            height={photo.media.height ?? 1067}
            priority
            sizes="(min-width: 1024px) 800px, 100vw"
            className="mx-auto max-h-[80vh] w-auto object-contain"
          />
        </figure>
        <aside className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{photo.title}</h1>
            {photo.caption && <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{photo.caption}</p>}
            <p className="mt-3 text-sm text-muted">
              {photo.credit && <>Photo: {photo.credit}</>}
              {photo.contributor?.name && <> · Shared by {photo.contributor.name}</>}
              {photo.publishedAt && <> · {formatDate(photo.publishedAt)}</>}
            </p>
          </div>
          {links.length > 0 && (
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="card flex items-center justify-between px-4 py-3 text-[15px] font-medium text-ink hover:border-brand-200">
                    {l.label} <span className="text-xs text-muted">{l.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <TrustNote target="photo" id={photo.id} name={photo.title} />
        </aside>
      </div>
    </div>
  );
}
