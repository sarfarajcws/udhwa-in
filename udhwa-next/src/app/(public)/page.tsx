import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Building2, Camera, MapPin, PenLine, Wrench } from "lucide-react";
import { BlogCard, NewsRow, PhotoTile, PlaceCard } from "@/components/public/cards";
import { Section } from "@/components/public/blocks";
import { SearchForm } from "@/components/public/search-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, JsonLd } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { organizationLd, websiteLd } from "@/lib/jsonld";
import { getHomeData, getPrimaryLocality } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";


export async function generateMetadata() {
  const locality = await getPrimaryLocality();
  const where = locality ? `${locality.name}${locality.parent ? `, ${locality.parent.name}` : ""}` : "your community";
  return {
    ...buildMetadata({
      title: `${site.name} — ${site.tagline}`,
      description: `Places, businesses, services, news, blogs and photos from ${where} — contributed by the community and verified by the Udhwa team.`,
      path: "/",
    }),
    title: { absolute: `${site.name} — ${site.tagline}` },
  };
}

export default async function HomePage() {
  // Rendered per request (so builds don't need the API); the API responses are cached and tagged "content".
  await connection();
  const [data, locality] = await Promise.all([getHomeData(), getPrimaryLocality()]);
  const hero = data.photos[0];
  const placeName = locality?.name ?? "your city";
  const region = [locality?.parent?.name, locality?.parent?.parent?.name].filter(Boolean).join(", ");

  const explore = [
    { href: "/places", icon: MapPin, title: "Places", question: "What is here?", count: data.counts.places, noun: "places" },
    { href: "/businesses", icon: Building2, title: "Businesses", question: "Who operates here?", count: data.counts.businesses, noun: "businesses" },
    { href: "/services", icon: Wrench, title: "Services", question: "What can I get done?", count: data.counts.services, noun: "services" },
  ];

  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd()]} />

      {/* ── Hero: what is Udhwa + what am I looking for ───────── */}
      <section className="border-b border-line bg-surface">
        <div className="container-page grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow flex items-center gap-2">
              <span className="inline-block size-2 rounded-full bg-amber-500" />
              {placeName}
              {region ? ` · ${region}` : ""}
            </p>
            <h1 className="mt-4 text-[2.35rem] leading-[1.08] font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Your city’s <span className="text-brand-600">digital home</span>.
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">
              The places, people, businesses and stories of {placeName} — gathered in one place, and kept accurate by the community and the Udhwa team.
            </p>
            <SearchForm className="mt-7 max-w-xl" size="lg" />
            <p className="mt-3 text-sm text-muted">
              Try{" "}
              <Link href="/search?q=lake" className="link">lake</Link>,{" "}
              <Link href="/search?q=restaurant" className="link">restaurant</Link> or{" "}
              <Link href="/search?q=electrician" className="link">electrician</Link>
            </p>
          </div>
          {hero && (
            <figure className="relative order-1 lg:order-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sunken lg:aspect-[5/4]">
                <SmartImage src={hero.media.url} alt={hero.media.alt} fill priority sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
              </div>
              {hero.place && (
                <figcaption className="absolute bottom-3 left-3 max-w-[85%] rounded-lg bg-surface/95 px-3 py-2 text-sm shadow-sm backdrop-blur">
                  <Link href={`/places/${hero.place.slug}`} className="font-semibold text-ink hover:text-brand-700">
                    {hero.place.name}
                  </Link>
                  <span className="block text-xs text-muted">{hero.title}</span>
                </figcaption>
              )}
            </figure>
          )}
        </div>
      </section>

      <div className="container-page">
        {/* ── Explore: what's here ─────────────────────────────── */}
        <section aria-labelledby="explore" className="pt-10 sm:pt-14">
          <h2 id="explore" className="sr-only">Explore</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {explore.map(({ href, icon: Icon, title, question, count, noun }) => (
              <li key={href}>
                <Link href={href} className="group card flex items-center gap-4 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40 sm:flex-col sm:items-start sm:p-5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold text-ink">{title}</span>
                    <span className="block text-sm text-muted">{question}</span>
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-brand-700 sm:mt-1">
                    {count} {noun} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── What's happening + places to know ────────────────── */}
        <div className="grid gap-x-12 lg:grid-cols-[1.6fr_1fr]">
          <Section title="What’s happening" eyebrow="News" href="/news" linkLabel="All news">
            {data.news.length ? (
              <div className="divide-y divide-line">
                {data.news.map((n) => (
                  <NewsRow key={n.id} article={n} />
                ))}
              </div>
            ) : (
              <EmptyState title="No news yet">Local updates will appear here once published.</EmptyState>
            )}
          </Section>
          <Section title="Places to know" eyebrow="Places" href="/places" linkLabel="All places">
            {data.places.length ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {data.places.slice(0, 4).map((p) => (
                  <PlaceCard key={p.id} place={p} />
                ))}
              </div>
            ) : (
              <EmptyState title="No places yet">Know a place worth listing? Suggest it.</EmptyState>
            )}
          </Section>
        </div>

        {/* ── Worth reading ────────────────────────────────────── */}
        {data.blogs.length > 0 && (
          <Section title="Worth reading" eyebrow="Blogs" href="/blogs" linkLabel="All blogs">
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr]">
              <BlogCard post={data.blogs[0]} large />
              <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-1 lg:gap-6">
                {data.blogs.slice(1, 3).map((b) => (
                  <BlogCard key={b.id} post={b} />
                ))}
              </div>
            </div>
          </Section>
        )}

        {/* ── What it looks like ───────────────────────────────── */}
        {data.photos.length > 2 && (
          <Section title={`${placeName} in pictures`} eyebrow="Photos" href="/photos" linkLabel="Gallery">
            <div className="grid auto-rows-[140px] grid-cols-2 gap-2 sm:auto-rows-[180px] md:grid-cols-4">
              {data.photos.slice(0, 5).map((p, i) => (
                <PhotoTile key={p.id} photo={p} className={i === 0 ? "col-span-2 row-span-2" : ""} sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"} />
              ))}
            </div>
          </Section>
        )}

        {/* ── How can I contribute ─────────────────────────────── */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-amber-100 bg-amber-50">
          <div className="grid gap-6 p-6 sm:p-10 md:grid-cols-[1.3fr_1fr] md:items-center">
            <div>
              <p className="eyebrow text-amber-700">Community</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Know something about {placeName}?</h2>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
                Suggest a place or a business, share a photo, write a blog, or tell us when something has changed. The Udhwa team reviews every
                contribution before it’s published — that’s how the information stays trustworthy.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href="/contribute" variant="primary">
                  <PenLine className="size-4" /> Contribute
                </ButtonLink>
                <ButtonLink href="/contribute/photo" variant="secondary">
                  <Camera className="size-4" /> Share a photo
                </ButtonLink>
              </div>
            </div>
            <ol className="space-y-3 text-sm text-ink-soft">
              {["You submit what you know", "The Udhwa team reviews and verifies it", "It’s published for everyone"].map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-amber-700 ring-1 ring-amber-100">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </>
  );
}
