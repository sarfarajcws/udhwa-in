import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Manifesto",
  description: "Every place has a story. Udhwa’s manifesto: local truth over virality, communities over algorithms, trust over traffic.",
  path: "/manifesto",
});

const stands = [
  ["Truth", "over virality", "Authentic, verified information matters more than what is trending."],
  ["Knowledge", "over noise", "Useful context beats an endless feed."],
  ["Communities", "over algorithms", "People decide what matters about their place — not engagement metrics."],
  ["People", "over pages", "Every voice deserves a seat at the table, not just the loudest."],
  ["Quality", "over quantity", "One accurate page is worth more than ten careless ones."],
  ["Trust", "over traffic", "Long-term credibility matters more than short-term attention."],
];

export default function ManifestoPage() {
  return (
    <article className="pb-6">
      <header className="border-b border-line bg-surface">
        <div className="container-page max-w-3xl py-14 sm:py-20">
          <p className="eyebrow text-amber-700">Manifesto</p>
          <h1 className="mt-3 text-4xl leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl">
            A platform for local voices, built for a global world.
          </h1>
        </div>
      </header>

      <div className="container-page max-w-3xl">
        <div className="prose-udhwa mt-12">
          <h2>Our core belief</h2>
          <p>
            The world is not shaped only by major cities and viral stories. It is shaped every day in small towns, villages and neighbourhoods — where
            real life happens, real problems exist, and real people want to be heard. Yet most of these places remain invisible on the internet.
          </p>
          <h2>The problem</h2>
          <p>The modern internet has become centralised, and local communities are left behind:</p>
          <ul>
            <li>Local realities are ignored or oversimplified.</li>
            <li>Algorithms prioritise attention over truth.</li>
            <li>Local news is missing or misrepresented.</li>
            <li>Small businesses struggle to be found.</li>
            <li>Writers chase trends instead of meaning.</li>
          </ul>
          <p>Millions of voices are present — but unheard.</p>
          <h2>Our purpose</h2>
          <p>
            We exist so that every place, no matter how small, can have a trustworthy digital home. Not for virality. Not for noise. For clarity,
            representation and trust.
          </p>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-ink">What we stand for</h2>
          <ul className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-2">
            {stands.map(([a, b, c]) => (
              <li key={a} className="bg-surface p-5">
                <p className="text-lg font-bold text-ink">
                  {a} <span className="font-medium text-muted">{b}</span>
                </p>
                <p className="mt-1 text-[15px] text-ink-soft">{c}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="prose-udhwa mt-14">
          <h2>What we do</h2>
          <ul>
            <li>Give towns, cities and villages a real digital identity.</li>
            <li>Let local people help represent their own communities.</li>
            <li>Publish local news with sources, from people who live the reality.</li>
            <li>Give writers a space to create without algorithmic pressure.</li>
            <li>Help small businesses be found — with dignity, not exploitation.</li>
            <li>Offer readers context, not just content.</li>
          </ul>
          <h2>Our commitment</h2>
          <p>
            We commit to <strong>verification over speed</strong>, <strong>accuracy over engagement</strong>, <strong>responsibility over growth</strong>,
            and <strong>community well-being over short-term gains</strong>. That is why everything on Udhwa is reviewed by the team before it is
            published, and why every page has a way to report a mistake.
          </p>
          <h2>For contributors and writers</h2>
          <p>Contributors are not content machines. Your honesty matters more than your reach; your local knowledge matters more than trends. You will never be asked to write for algorithms or trade integrity for clicks.</p>
          <h2>What we refuse to become</h2>
          <ul>
            <li>A noise-driven media outlet.</li>
            <li>A platform built on manipulation.</li>
            <li>A system that exploits contributors.</li>
            <li>A space where growth compromises values.</li>
          </ul>
        </div>

        <blockquote className="mt-14 border-l-4 border-amber-400 pl-5 text-xl leading-relaxed font-medium text-ink sm:text-2xl">
          Every place has a story. Every story belongs to real people. And every voice deserves to be heard.
        </blockquote>
        <p className="mt-6 text-sm text-muted">Written and maintained by {site.founder}, founder of Udhwa.</p>
      </div>
    </article>
  );
}
