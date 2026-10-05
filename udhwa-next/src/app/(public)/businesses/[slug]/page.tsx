import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { BlogCard, BusinessCard, NewsRow, ServiceCard } from "@/components/public/cards";
import { TrustNote } from "@/components/public/blocks";
import { AddressLine, ContactActions, CoverFigure, Facts, HoursList, PhotoStrip, SubSection } from "@/components/public/detail";
import { Badge, Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbLd, businessSchemaType, localBusinessLd, type Hours } from "@/lib/jsonld";
import { getBusiness } from "@/lib/queries";
import { redirectOrNotFound } from "@/lib/redirects";
import { RichContent } from "@/components/ui/rich-content";
import { isDocEmpty } from "@/lib/rich-text/schema";
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

export async function generateMetadata({ params }: PageProps<"/businesses/[slug]">) {
  const { slug } = await params;
  const data = await getBusiness(slug);
  if (!data) return {};
  const { business: b } = data;
  return buildMetadata({
    title: b.category ? `${b.name} — ${b.category.name}` : b.name,
    description: [b.summary, b.address].filter(Boolean).join(" · "),
    path: `/businesses/${b.slug}`,
    image: b.cover,
    seo: b,
  });
}

export default async function BusinessPage({ params }: PageProps<"/businesses/[slug]">) {
  const { slug } = await params;
  const data = await getBusiness(slug);
  if (!data) return redirectOrNotFound(`/businesses/${slug}`);
  const { business: b, area, services, news, blogs, photos, nearby } = data;
  const path = `/businesses/${b.slug}`;
  const hours = (b.openingHours as Hours | null) ?? null;

  return (
    <article className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          localBusinessLd({ name: b.name, summary: b.summary, path, image: b.cover, address: b.address, area, phone: b.phone, email: b.email, website: b.website, lat: b.latitude, lng: b.longitude, hours, type: businessSchemaType(b.category?.slug) }),
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Businesses", path: "/businesses" }, { name: b.name, path }]),
        ]}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Businesses", href: "/businesses" }, { name: b.name }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              {b.category && <p className="eyebrow text-amber-700">{b.category.name}</p>}
              {b.verifiedAt && (
                <Badge tone="blue">
                  <BadgeCheck className="size-3.5" /> Verified {formatDate(b.verifiedAt)}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-[2.6rem] sm:leading-tight">{b.name}</h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">{b.summary}</p>
            <div className="mt-4 space-y-4">
              <AddressLine address={b.address} />
              <ContactActions phone={b.phone} whatsapp={b.whatsapp} website={b.website} email={b.email} address={b.address} lat={b.latitude} lng={b.longitude} />
            </div>
          </header>

          <div className="mt-8">
            <CoverFigure media={b.cover} aspect="aspect-[16/9]" />
          </div>

          {!isDocEmpty(b.about) && (
            <section className="mt-10">
              <h2 className="text-xl font-bold tracking-tight text-ink">About</h2>
              <RichContent doc={b.about} className="prose-udhwa mt-3" />
            </section>
          )}

          {b.offerings.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold tracking-tight text-ink">What they offer</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {b.offerings.map((o) => (
                  <li key={o} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink-soft">
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {services.length > 0 && (
            <SubSection title="Services">
              <div className="grid gap-4 sm:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
            </SubSection>
          )}
          <PhotoStrip photos={photos} title={`Photos of ${b.name}`} />
          {news.length > 0 && (
            <SubSection title="In the news">
              <div className="divide-y divide-line">{news.map((n) => <NewsRow key={n.id} article={n} />)}</div>
            </SubSection>
          )}
          {blogs.length > 0 && (
            <SubSection title="Worth reading">
              <div className="grid gap-8 sm:grid-cols-2">{blogs.map((p) => <BlogCard key={p.id} post={p} />)}</div>
            </SubSection>
          )}
          {nearby.length > 0 && (
            <SubSection title="Nearby">
              <div className="grid gap-3 md:grid-cols-2">{nearby.map((n) => <BusinessCard key={n.id} business={n} />)}</div>
            </SubSection>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Facts
            items={[
              { label: "Hours", value: hours?.length || b.hoursNote ? <HoursList hours={hours} note={b.hoursNote} /> : null },
              { label: "Phone", value: b.phone ? <a className="link" href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a> : null },
              { label: "Address", value: b.address },
              { label: "Near", value: b.place && b.place.status === "PUBLISHED" ? <Link className="link" href={`/places/${b.place.slug}`}>{b.place.name}</Link> : null },
            ]}
          />
          <TrustNote target="business" id={b.id} name={b.name} updatedAt={b.updatedAt} verifiedAt={b.verifiedAt} claimable />
        </aside>
      </div>
    </article>
  );
}
