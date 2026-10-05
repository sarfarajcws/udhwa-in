import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Safe JSON-LD serialisation (prevents `</script>` breakouts). */
export function jsonLdString(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  // The only raw-HTML injection in the app: JSON-LD, escaped against </script>.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />;
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "blue" | "amber" | "green" | "red"; className?: string }) {
  const tones = {
    neutral: "bg-sunken text-ink-soft",
    blue: "bg-brand-50 text-brand-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-line-strong">/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page" className="line-clamp-1 text-ink-soft">
                {it.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pagination({ page, pages, makeHref }: { page: number; pages: number; makeHref: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} rel="prev" className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-sunken">
          <ChevronLeft className="size-4" /> Prev
        </Link>
      ) : null}
      {nums.map((n, i) => (
        <span key={n} className="flex items-center">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={makeHref(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn("flex size-10 items-center justify-center rounded-lg text-sm font-medium", n === page ? "bg-ink text-white" : "text-ink-soft hover:bg-sunken")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={makeHref(page + 1)} rel="next" className="flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-ink-soft hover:bg-sunken">
          Next <ChevronRight className="size-4" />
        </Link>
      ) : null}
    </nav>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: "info" | "success" | "warning" | "error"; children: ReactNode; className?: string }) {
  const tones = {
    info: "border-brand-200 bg-brand-50 text-brand-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-100 bg-amber-50 text-amber-700",
    error: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}
