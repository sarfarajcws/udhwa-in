import Image from "next/image";
import { connection } from "next/server";
import { ButtonLink } from "@/components/ui/button";
import { getPrimaryLocality } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";


export const metadata = buildMetadata({
  title: "About Udhwa",
  description: "Udhwa began as a digital identity for a village in Sahibganj, Jharkhand, and is growing into a digital home for any place and its community.",
  path: "/about",
});

export default async function AboutPage() {
  await connection();
  const locality = await getPrimaryLocality();
  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="container-page grid gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Our story</p>
            <h1 className="mt-3 text-4xl leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl">A digital home for a place and its people.</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted">
              Udhwa started with a simple idea: give a small village in Jharkhand a clear, trustworthy presence on the internet. It is growing into a
              platform any town, village or neighbourhood can call home.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sunken">
            <Image src="/seed/udhwa-lake-hills.jpg" alt="Udhwa Lake wetlands with the Rajmahal hills" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" priority />
          </div>
        </div>
      </section>

      <div className="container-page grid gap-14 py-14 lg:grid-cols-[1fr_340px]">
        <div className="prose-udhwa max-w-2xl">
          <h2>How it began</h2>
          <p>
            {locality?.description ??
              "Udhwa is a village in Sahibganj district, Jharkhand, best known for the Udhwa Lake Bird Sanctuary."}{" "}
            Like most small places, almost nothing about it could be found online — not its lake, its schools, its shops or its news.
          </p>
          <p>
            Udhwa.in began as a local initiative to change that. It has since grown into a broader vision: a platform where any community can
            gather what is useful about its place — places, businesses, services, news, writing and photographs — in one connected space.
          </p>
          <h2>What Udhwa is</h2>
          <p>
            Udhwa is not a news site, a directory or a social network, though it borrows a little from each. It is a <strong>digital home</strong>: somewhere
            a resident, a visitor or anyone curious can find out what is here, who is here, what is happening and what is worth reading.
          </p>
          <h2>How information stays trustworthy</h2>
          <p>
            Anyone can contribute — suggest a place, share a photo, write a blog or report a mistake. But only the Udhwa team publishes or changes
            information, after reviewing it. Even business owners send updates rather than editing their own pages. This controlled model is
            deliberate: it is what lets people rely on what they read.
          </p>
          <h2>Where we’re going</h2>
          <p>
            The platform is built to support many places, not one. Udhwa is the first. As more communities join, the same careful approach will
            go with them.
          </p>
        </div>

        <aside className="space-y-6">
          <div className="card overflow-hidden">
            <div className="relative aspect-[4/5] bg-sunken">
              <Image src="/seed/sarfaraj-alam.jpg" alt={`${site.founder}, founder of Udhwa`} fill sizes="340px" className="object-cover object-top" />
            </div>
            <div className="p-5">
              <p className="eyebrow">Founder</p>
              <p className="mt-1 text-lg font-semibold text-ink">{site.founder}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A self-taught web developer from Udhwa. He started this platform for his village; it now belongs to everyone who believes in the
                power of community.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <ButtonLink href="/contribute">Contribute</ButtonLink>
            <ButtonLink href="/manifesto" variant="secondary">
              Read the manifesto
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
