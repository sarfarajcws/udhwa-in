import Link from "next/link";
import { ArrowRight, Building2, Camera, MapPin, MessageSquareWarning, Newspaper, PenLine, Wrench } from "lucide-react";
import { PageHeader } from "@/components/public/blocks";
import { CONTRIBUTION_TYPES } from "@/lib/contribution-types";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contribute",
  description: "Help keep Udhwa accurate and useful: suggest places, businesses and services, share photos, send community updates or write a blog.",
  path: "/contribute",
});

const ICONS = { PLACE: MapPin, BUSINESS: Building2, SERVICE: Wrench, PHOTO: Camera, NEWS: Newspaper, BLOG: PenLine };

export default function ContributePage() {
  return (
    <>
      <PageHeader
        title="Contribute to Udhwa"
        description="Udhwa grows with the knowledge of the people who live here. Share what you know — the team reviews every contribution before it’s published, so the information stays trustworthy."
      />
      <div className="container-page py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CONTRIBUTION_TYPES.map((t) => {
            const Icon = ICONS[t.type];
            return (
              <li key={t.type}>
                <Link href={`/contribute/${t.slug}`} className="group card flex h-full flex-col p-5 transition-colors hover:border-brand-200">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon className="size-5" />
                  </span>
                  <span className="mt-4 text-lg font-semibold text-ink">{t.title}</span>
                  <span className="mt-1 text-sm text-muted">{t.description}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex flex-col gap-4 rounded-[var(--radius-card)] border border-amber-100 bg-amber-50 p-5 sm:flex-row sm:items-center">
          <MessageSquareWarning className="size-6 shrink-0 text-amber-700" />
          <div className="flex-1 text-sm text-ink-soft">
            <p className="font-semibold text-ink">Found something wrong or out of date?</p>
            <p>Open the page and use “Suggest a correction” — it goes straight to the team with the page attached. Business owners can request updates the same way.</p>
          </div>
        </div>

        <section className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            ["1. You share", "Submit what you know. You’ll need to sign in with Google so the team can follow up if needed."],
            ["2. We review", "The Udhwa team checks every contribution — and may ask for changes or more details."],
            ["3. It’s published", "Once verified, the team publishes it. You can track the status of everything you’ve sent from your profile."],
          ].map(([t, d]) => (
            <div key={t}>
              <h2 className="font-semibold text-ink">{t}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
