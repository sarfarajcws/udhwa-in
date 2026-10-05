import Form from "next/form";
import Link from "next/link";
import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { FilterChips, PageHeader } from "./blocks";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { listHref } from "@/lib/utils";

/** Shared shell for Places / Businesses / Services / News / Blogs listings. */
const plural = (n: string) => (n.endsWith("s") ? `${n}es` : `${n}s`);

export function Listing({
  base, title, description, categories, category, q, page, pages, total, noun, children, emptyCta, tag,
}: {
  base: string; title: string; description: string;
  categories: { slug: string; name: string }[]; category?: string; q?: string;
  page: number; pages: number; total: number; noun: string; children: ReactNode; emptyCta?: { href: string; label: string };
  /** Active tag filter (blogs), kept across search, chips and pagination. */
  tag?: { slug: string; name: string };
}) {
  return (
    <>
      <PageHeader title={title} description={description}>
        <Form action={base} className="relative mt-6 max-w-md" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          {tag && <input type="hidden" name="tag" value={tag.slug} />}
          <label htmlFor="list-q" className="sr-only">Search {title.toLowerCase()}</label>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input id="list-q" name="q" type="search" defaultValue={q} placeholder={`Search ${title.toLowerCase()}…`} maxLength={100} className="field h-11 pl-10" />
        </Form>
      </PageHeader>
      <div className="container-page py-8">
        {categories.length > 0 && <FilterChips items={categories} active={category} makeHref={(c) => listHref(base, { category: c, q, tag: tag?.slug })} />}
        {tag && (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
            Tagged <span className="font-medium text-ink">#{tag.name}</span>
            <Link href={listHref(base, { category, q })} className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-ink-soft hover:border-ink/40">
              Clear
            </Link>
          </p>
        )}
        <p className="mt-5 text-sm text-muted" aria-live="polite">
          {total} {total === 1 ? noun : plural(noun)}
          {q ? <> matching “<span className="font-medium text-ink">{q}</span>”</> : null}
        </p>
        <div className="mt-5">
          {total === 0 ? (
            <EmptyState
              title={q ? "Nothing matches that search" : `No ${plural(noun)} here yet`}
              action={emptyCta ? <ButtonLink href={emptyCta.href} variant="secondary">{emptyCta.label}</ButtonLink> : undefined}
            >
              {q ? "Try a different word, or clear the filters." : "Know one that belongs here? Suggest it — the Udhwa team will review it."}
            </EmptyState>
          ) : (
            children
          )}
        </div>
        <Pagination page={page} pages={pages} makeHref={(p) => listHref(base, { category, q, tag: tag?.slug, page: p })} />
      </div>
    </>
  );
}
