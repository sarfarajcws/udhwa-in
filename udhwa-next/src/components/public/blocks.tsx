import Link from "next/link";
import { ArrowRight, Flag, MessageSquareWarning } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({ title, eyebrow, href, linkLabel = "See all", children, className, description }: {
  title: string;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-10 sm:py-14", className)}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.75rem]">{title}</h2>
          {description && <p className="mt-1.5 max-w-xl text-[15px] text-muted">{description}</p>}
        </div>
        {href && (
          <Link href={href} className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
            {linkLabel} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, eyebrow, children }: { title: string; description?: string; eyebrow?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page py-10 sm:py-14">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">{description}</p>}
        {children}
      </div>
    </div>
  );
}

/** Category chips as plain links (crawlable, no client JS). */
export function FilterChips({ items, active, makeHref, allLabel = "All" }: {
  items: { slug: string; name: string }[];
  active?: string;
  makeHref: (slug?: string) => string;
  allLabel?: string;
}) {
  const chip = (isActive: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors",
      isActive ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:border-ink/40",
    );
  return (
    <nav aria-label="Filter by category" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 pr-4 sm:pr-0">
        <li className="shrink-0">
          <Link href={makeHref(undefined)} className={chip(!active)} aria-current={!active ? "true" : undefined}>
            {allLabel}
          </Link>
        </li>
        {items.map((c) => (
          <li key={c.slug} className="shrink-0">
            <Link href={makeHref(c.slug)} className={chip(active === c.slug)} aria-current={active === c.slug ? "true" : undefined}>
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type CorrectionTarget = "place" | "business" | "service" | "news" | "blog" | "photo";

/** Trust block shown on every published entity. */
export function TrustNote({ target, id, name, updatedAt, verifiedAt, claimable }: {
  target: CorrectionTarget;
  id: string;
  name: string;
  updatedAt?: Date | null;
  verifiedAt?: Date | null;
  claimable?: boolean;
}) {
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(d);
  const base = `/contribute/correction?target=${target}&id=${id}`;
  return (
    <aside className="rounded-[var(--radius-card)] border border-line bg-sunken/60 p-5 text-sm">
      <p className="font-semibold text-ink">Is this information correct?</p>
      <p className="mt-1 text-muted">
        Udhwa is maintained by its team with help from the community.
        {verifiedAt ? ` Verified ${fmt(verifiedAt)}.` : ""}
        {updatedAt ? ` Last updated ${fmt(updatedAt)}.` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        <Link href={base} className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800">
          <MessageSquareWarning className="size-4" /> Suggest a correction
        </Link>
        {claimable && (
          <Link href={`${base}&kind=OWNERSHIP_CLAIM`} className="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-ink">
            <Flag className="size-4" /> I run {name.length > 28 ? "this business" : name}
          </Link>
        )}
      </div>
    </aside>
  );
}

export function RelatedList({ title, items }: { title: string; items: { href: string; label: string; meta?: string }[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h2 className="eyebrow">{title}</h2>
      <ul className="mt-3 divide-y divide-line">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="group flex items-center justify-between gap-3 py-2.5">
              <span className="text-[15px] font-medium text-ink group-hover:text-brand-700">{it.label}</span>
              {it.meta && <span className="shrink-0 text-xs text-muted">{it.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
