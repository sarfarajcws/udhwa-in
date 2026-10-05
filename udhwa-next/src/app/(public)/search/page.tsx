import Link from "next/link";
import { SearchForm } from "@/components/public/search-form";
import { EmptyState } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { SEARCH_KINDS, hitHref, type SearchKind } from "@/lib/search-query";
import { search } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { listHref } from "@/lib/utils";
import { cn, formatDate, stringParam, truncate } from "@/lib/utils";

export async function generateMetadata({ searchParams }: PageProps<"/search">) {
  const q = stringParam((await searchParams).q);
  return buildMetadata({
    title: q ? `Search: ${q}` : "Search",
    description: "Search places, businesses, services, news, blogs and photos on Udhwa.",
    path: "/search",
    noIndex: true,
  });
}

const KIND_LABEL: Record<SearchKind, string> = { place: "Place", business: "Business", service: "Service", news: "News", blog: "Blog", photo: "Photo" };

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = stringParam(sp.q)?.slice(0, 100);
  const typeParam = stringParam(sp.type);
  const kind = SEARCH_KINDS.some((k) => k.kind === typeParam) ? (typeParam as SearchKind) : undefined;
  // Search is uncached; a failure (rate limit, API down) shows inline instead of breaking the page.
  let hits: Awaited<ReturnType<typeof search>>["hits"] = [];
  let failed = false;
  if (q) {
    try {
      hits = (await search(q, kind)).hits;
    } catch (e) {
      console.error("[search]", e);
      failed = true;
    }
  }

  return (
    <div className="container-page py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Search</h1>
      <SearchForm defaultValue={q} className="mt-5 max-w-2xl" kind={kind} />

      {q && (
        <nav aria-label="Filter results" className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {[{ kind: undefined, label: "Everything" }, ...SEARCH_KINDS].map((k) => (
              <li key={k.label}>
                <Link
                  href={listHref("/search", { q, type: k.kind })}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium whitespace-nowrap",
                    kind === k.kind ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-soft hover:border-ink/40",
                  )}
                >
                  {k.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8 max-w-3xl">
        {!q ? (
          <p className="text-muted">Search across places, businesses, services, news, blogs and photos.</p>
        ) : failed ? (
          <EmptyState title="Search is unavailable right now">Please try again in a moment.</EmptyState>
        ) : hits.length === 0 ? (
          <EmptyState title={`No results for “${q}”`}>
            Try a shorter or different word. If something is missing from Udhwa, you can{" "}
            <Link href="/contribute" className="link">suggest it</Link>.
          </EmptyState>
        ) : (
          <>
            <p className="text-sm text-muted" aria-live="polite">
              {hits.length} result{hits.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-4 divide-y divide-line">
              {hits.map((h) => (
                <li key={`${h.kind}-${h.id}`} className="relative flex gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                      {KIND_LABEL[h.kind]}
                      {h.date && (h.kind === "news" || h.kind === "blog") ? <span className="ml-2 font-normal text-muted normal-case">{formatDate(h.date)}</span> : null}
                    </p>
                    <h2 className="mt-1 text-[17px] font-semibold text-ink">
                      <Link href={hitHref(h)} className="after:absolute after:inset-0 hover:text-brand-700">
                        {h.title}
                      </Link>
                    </h2>
                    {h.snippet && <p className="mt-1 text-sm text-muted">{truncate(h.snippet, 180)}</p>}
                  </div>
                  {h.imageUrl && (
                    <div className="relative hidden size-20 shrink-0 overflow-hidden rounded-lg bg-sunken sm:block">
                      <SmartImage src={h.imageUrl} alt={h.imageAlt ?? ""} fill sizes="80px" className="object-cover" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
