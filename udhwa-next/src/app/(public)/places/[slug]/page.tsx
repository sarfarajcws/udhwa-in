import { BlogCard, BusinessCard, NewsRow, ServiceCard } from "@/components/public/cards";
import { RelatedList, TrustNote } from "@/components/public/blocks";
import { AddressLine, ContactActions, CoverFigure, Facts, PhotoStrip, SubSection } from "@/components/public/detail";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbLd, placeLd } from "@/lib/jsonld";
import { getPlace } from "@/lib/queries";
import { redirectOrNotFound } from "@/lib/redirects";
import { RichContent } from "@/components/ui/rich-content";
import { isDocEmpty } from "@/lib/rich-text/schema";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

/**
 * Rendered on first visit, then cached (ISR) until the API reports a content
 * change via /api/revalidate — so builds never depend on the API being up.
 */
export async function generateStaticParams() {
  return [];
}

const PLACE_SCHEMA: Record<string, string> = { nature: "TouristAttraction", landmark: "TouristAttraction", water: "LakeBodyOfWater", education: "School" };

export async function generateMetadata({ params }: PageProps<"/places/[slug]">) {
  const { slug } = await params;
  const data = await getPlace(slug);
  if (!data) return {};
  const { place } = data;
  return buildMetadata({ title: place.name, description: place.summary, path: `/places/${place.slug}`, image: place.cover, seo: place });
}

export default async function PlacePage({ params }: PageProps<"/places/[slug]">) {
  const { slug } = await params;
  const data = await getPlace(slug);
  if (!data) return redirectOrNotFound(`/places/${slug}`);
  const { place, area, businesses, services, news, blogs, photos } = data;
  const path = `/places/${place.slug}`;

  return (
    <article className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          placeLd({ name: place.name, summary: place.summary, path, image: place.cover, address: place.address, area, lat: place.latitude, lng: place.longitude, kind: PLACE_SCHEMA[place.category?.slug ?? ""] }),
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Places", path: "/places" }, { name: place.name, path }]),
        ]}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Places", href: "/places" }, { name: place.name }]} />

      <header className="mt-6 max-w-3xl">
        {place.category && <p className="eyebrow text-brand-700">{place.category.name}</p>}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-[2.6rem] sm:leading-tight">{place.name}</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted">{place.summary}</p>
        <div className="mt-4 space-y-4">
          <AddressLine address={place.address} />
          <ContactActions address={place.address} lat={place.latitude} lng={place.longitude} />
        </div>
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <CoverFigure media={place.cover} />

          {!isDocEmpty(place.about) && (
            <section className="mt-10">
              <h2 className="sr-only">About {place.name}</h2>
              <RichContent doc={place.about} />
            </section>
          )}
          {!isDocEmpty(place.history) && (
            <section className="mt-10">
              <h2 className="text-xl font-bold tracking-tight text-ink">History</h2>
              <RichContent doc={place.history} className="prose-udhwa mt-3" />
            </section>
          )}

          <PhotoStrip photos={photos} title={`Photos of ${place.name}`} href={`/photos?place=${place.slug}`} />

          {businesses.length > 0 && (
            <SubSection title="Businesses here">
              <div className="grid gap-3 md:grid-cols-2">{businesses.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
            </SubSection>
          )}
          {services.length > 0 && (
            <SubSection title="Services nearby">
              <div className="grid gap-4 sm:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
            </SubSection>
          )}
          {news.length > 0 && (
            <SubSection title={`News about ${place.name}`}>
              <div className="divide-y divide-line">{news.map((n) => <NewsRow key={n.id} article={n} />)}</div>
            </SubSection>
          )}
          {blogs.length > 0 && (
            <SubSection title="Worth reading">
              <div className="grid gap-8 sm:grid-cols-2">{blogs.map((b) => <BlogCard key={b.id} post={b} />)}</div>
            </SubSection>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Facts
            items={[
              { label: "Type", value: place.category?.name },
              { label: "Area", value: [area?.locality, area?.district, area?.region].filter(Boolean).join(", ") },
              { label: "Address", value: place.address },
            ]}
          />
          <RelatedList
            title="Connected"
            items={[
              ...businesses.slice(0, 3).map((b) => ({ href: `/businesses/${b.slug}`, label: b.name, meta: "Business" })),
              ...blogs.slice(0, 2).map((b) => ({ href: `/blogs/${b.slug}`, label: b.title, meta: "Blog" })),
            ]}
          />
          <TrustNote target="place" id={place.id} name={place.name} updatedAt={place.updatedAt} verifiedAt={place.verifiedAt} />
        </aside>
      </div>
    </article>
  );
}
