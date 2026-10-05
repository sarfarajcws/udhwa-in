import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/utils";

/** Shared byline for News and Blogs. */
export function Byline({ author, publishedAt, updatedAt, readingMinutes }: {
  author?: { name: string; slug: string; avatarUrl?: string | null } | null;
  publishedAt: Date | null;
  updatedAt?: Date | null;
  readingMinutes?: number;
}) {
  const showUpdated = updatedAt && publishedAt && updatedAt.getTime() - publishedAt.getTime() > 24 * 3600 * 1000;
  return (
    <div className="flex items-center gap-3 text-sm">
      {author?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar
        <img src={author.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
      ) : (
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 font-bold text-brand-700">{(author?.name ?? "U").charAt(0)}</span>
      )}
      <div>
        <p className="font-semibold text-ink">
          {author ? (
            <Link href={`/authors/${author.slug}`} className="hover:text-brand-700">
              {author.name}
            </Link>
          ) : (
            "Udhwa"
          )}
        </p>
        <p className="text-muted">
          <time dateTime={publishedAt?.toISOString()}>{formatDate(publishedAt)}</time>
          {readingMinutes ? <> · {readingMinutes} min read</> : null}
          {showUpdated ? <> · Updated {formatDate(updatedAt)}</> : null}
        </p>
      </div>
    </div>
  );
}

export function Tags({ tags, base }: { tags: { name: string; slug: string }[]; base?: string }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
      {tags.map((t) => (
        <li key={t.slug}>
          {base ? (
            <Link href={`${base}?tag=${t.slug}`} className="inline-block rounded-full bg-sunken px-3 py-1 text-sm text-ink-soft hover:bg-line">
              #{t.name}
            </Link>
          ) : (
            <span className="inline-block rounded-full bg-sunken px-3 py-1 text-sm text-ink-soft">#{t.name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ConnectedTo({ items }: { items: { label: string; href: string; kind: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Related:</span>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 font-medium text-ink-soft hover:border-brand-200 hover:text-brand-700">
          <span className="text-xs text-muted">{i.kind}</span> {i.label}
        </Link>
      ))}
    </div>
  );
}

export function ArticleShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[44rem]">{children}</div>;
}
