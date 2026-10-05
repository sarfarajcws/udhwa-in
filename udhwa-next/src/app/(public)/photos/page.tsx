import Link from "next/link";
import { Camera, X } from "lucide-react";
import { PhotoTile } from "@/components/public/cards";
import { FilterChips, PageHeader } from "@/components/public/blocks";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { getCategories, listPhotos } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { listHref, pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const DESCRIPTION = "Real photographs of the place and its people — lakes, landmarks, streets and businesses — shared by the community and reviewed by the Udhwa team.";

/**
 * Gallery with category chips. Category pages are indexable landing pages;
 * place/service filters are views of other pages' photos, so they're noindex.
 */
export async function generateMetadata({ searchParams }: PageProps<"/photos">) {
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const categories = await getCategories("PHOTO");
  const category = categories.find((c) => c.slug === stringParam(sp.category));
  const title = category ? `${category.name} — Photos` : "Photos";
  return buildMetadata({
    title: page > 1 ? `${title} (page ${page})` : title,
    description: DESCRIPTION,
    path: listHref("/photos", { category: category?.slug, page }),
    noIndex: Boolean(stringParam(sp.place) || stringParam(sp.service)),
  });
}

export default async function PhotosPage({ searchParams }: PageProps<"/photos">) {
  const sp = await searchParams;
  const place = stringParam(sp.place);
  const service = stringParam(sp.service);
  const category = stringParam(sp.category);
  const [categories, { items, page, pages, total }] = await Promise.all([
    getCategories("PHOTO"),
    listPhotos({ page: pageParam(sp.page), place, service, category }),
  ]);
  // Name the place/service filter from the results themselves (they all share it).
  const scope = place ? items[0]?.place?.name ?? place : service ? items[0]?.service?.name ?? service : null;
  const filtered = Boolean(place || service || category);

  return (
    <>
      <PageHeader title={scope ? `Photos of ${scope}` : "Photos"} description="What the place looks like — real photographs shared by the community and reviewed by the Udhwa team.">
        <div className="mt-6">
          <ButtonLink href="/contribute/photo" variant="secondary">
            <Camera className="size-4" /> Share a photo
          </ButtonLink>
        </div>
      </PageHeader>
      <div className="container-page py-8">
        {categories.length > 0 && <FilterChips items={categories} active={category} makeHref={(c) => listHref("/photos", { category: c, place, service })} />}
        {scope && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            Showing photos linked to <span className="font-medium text-ink">{scope}</span>
            <Link href={listHref("/photos", { category })} className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-soft hover:border-ink/40">
              <X className="size-3" /> Clear
            </Link>
          </p>
        )}
        <p className="mt-4 text-sm text-muted" aria-live="polite">{total} {total === 1 ? "photo" : "photos"}</p>
        <div className="mt-4">
          {total === 0 ? (
            <EmptyState
              title={filtered ? "No photos match this filter" : "No photos yet"}
              action={<ButtonLink href={filtered ? "/photos" : "/contribute/photo"} variant="secondary">{filtered ? "See all photos" : "Share a photo"}</ButtonLink>}
            >
              {filtered ? "Try another category, or browse the whole gallery." : "Be the first to share a photograph."}
            </EmptyState>
          ) : (
            <div className="grid auto-rows-[150px] grid-cols-2 gap-2 sm:auto-rows-[200px] md:grid-cols-3 lg:grid-cols-4">
              {items.map((p, i) => (
                <PhotoTile key={p.id} photo={p} className={i % 7 === 0 ? "row-span-2" : ""} sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" />
              ))}
            </div>
          )}
        </div>
        <Pagination page={page} pages={pages} makeHref={(p) => listHref("/photos", { category, place, service, page: p })} />
      </div>
    </>
  );
}
