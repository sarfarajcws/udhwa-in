import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Progressive-enhancement search: a GET form to /search (works without JS). */
export function SearchForm({ defaultValue, className, size = "md", kind }: { defaultValue?: string; className?: string; size?: "md" | "lg"; kind?: string }) {
  return (
    <Form action="/search" role="search" className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search places, businesses, services, news and blogs
      </label>
      <Search className={cn("pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted", size === "lg" ? "size-5" : "size-4")} />
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search places, shops, services, news…"
        autoComplete="off"
        maxLength={100}
        className={cn(
          "w-full rounded-xl border border-line-strong bg-surface text-ink placeholder:text-muted/80 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 focus:outline-none",
          size === "lg" ? "h-14 pr-28 pl-12 text-base" : "h-12 pr-24 pl-11 text-[15px]",
        )}
      />
      {kind && <input type="hidden" name="type" value={kind} />}
      <button
        type="submit"
        className={cn("absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-brand-600 font-semibold text-white hover:bg-brand-700", size === "lg" ? "h-10 px-5" : "h-8 px-4 text-sm")}
      >
        Search
      </button>
    </Form>
  );
}
