import Link from "next/link";
import { BlogCard, ServiceCard } from "@/components/public/cards";
import { TrustNote } from "@/components/public/blocks";
import { ContactActions, CoverFigure, Facts, PhotoStrip, SubSection } from "@/components/public/detail";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { breadcrumbLd, serviceLd } from "@/lib/jsonld";
import { getService } from "@/lib/queries";
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

export async function generateMetadata({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const data = await getService(slug);
  if (!data) return {};
  const { service: s } = data;
  return buildMetadata({
    title: s.serviceArea ? `${s.name} in ${s.serviceArea}` : s.name,
    description: s.summary,
    path: `/services/${s.slug}`,
    image: s.cover,
    seo: s,
  });
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const data = await getService(slug);
  if (!data) return redirectOrNotFound(`/services/${slug}`);
  const { service: s, area, related, blogs, photos } = data;
  const path = `/services/${s.slug}`;
  const business = s.business?.status === "PUBLISHED" ? s.business : null;
  const phone = s.phone ?? business?.phone ?? null;

  return (
    <article className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          serviceLd({
            name: s.name, summary: s.summary, path, image: s.cover, providerName: business?.name ?? s.providerName, providerType: s.providerType,
            providerPath: business ? `/businesses/${business.slug}` : null, serviceArea: s.serviceArea, area, phone, category: s.category?.name,
          }),
          breadcrumbLd([{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: s.name, path }]),
        ]}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Services", href: "/services" }, { name: s.name }]} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {s.category && <p className="eyebrow text-brand-700">{s.category.name}</p>}
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-[2.6rem] sm:leading-tight">{s.name}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">{s.summary}</p>
          <p className="mt-4 text-[15px] text-ink-soft">
            Provided by{" "}
            {business ? (
              <Link href={`/businesses/${business.slug}`} className="link font-semibold">
                {business.name}
              </Link>
            ) : (
              <span className="font-semibold text-ink">{s.providerName}</span>
            )}
          </p>
          <div className="mt-5">
            <ContactActions phone={phone} whatsapp={s.whatsapp} />
          </div>

          {s.cover && (
            <div className="mt-8">
              <CoverFigure media={s.cover} />
            </div>
          )}

          {!isDocEmpty(s.description) && (
            <section className="mt-10">
              <h2 className="sr-only">About this service</h2>
              <RichContent doc={s.description} />
            </section>
          )}

          {s.highlights.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold tracking-tight text-ink">What’s included</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {s.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-[15px] text-ink-soft">
                    <span className="size-1.5 rounded-full bg-amber-500" /> {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <PhotoStrip photos={photos} title={`Photos of ${s.name}`} href={photos.length >= 9 ? `/photos?service=${s.slug}` : undefined} />

          {blogs.length > 0 && (
            <SubSection title="Worth reading">
              <div className="grid gap-8 sm:grid-cols-2">{blogs.map((b) => <BlogCard key={b.id} post={b} />)}</div>
            </SubSection>
          )}
          {related.length > 0 && (
            <SubSection title={`More ${s.category?.name.toLowerCase() ?? "services"}`}>
              <div className="grid gap-4 sm:grid-cols-2">{related.map((r) => <ServiceCard key={r.id} service={r} />)}</div>
            </SubSection>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Facts
            items={[
              { label: "Provider", value: s.providerType === "BUSINESS" ? `${s.providerName} (business)` : s.providerName },
              { label: "Service area", value: s.serviceArea || [area?.locality, area?.district].filter(Boolean).join(", ") || null },
              { label: "Availability", value: s.availability },
              { label: "Phone", value: phone ? <a className="link" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a> : null },
              { label: "Near", value: s.place?.status === "PUBLISHED" ? <Link className="link" href={`/places/${s.place.slug}`}>{s.place.name}</Link> : null },
            ]}
          />
          <TrustNote target="service" id={s.id} name={s.name} updatedAt={s.updatedAt} verifiedAt={s.verifiedAt} />
        </aside>
      </div>
    </article>
  );
}
