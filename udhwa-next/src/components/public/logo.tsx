import Link from "next/link";
import { cn } from "@/lib/utils";

/** Udhwa wordmark: a simple roofline ("digital home") + lowercase name. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 text-ink", className)} aria-label="Udhwa — home">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className="fill-brand-600" />
        <path d="M8 15.5 16 9l8 6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 15v7.5h10V15" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="16" cy="18.5" r="2" className="fill-amber-400" />
      </svg>
      <span className="text-[1.35rem] leading-none font-bold tracking-tight">udhwa</span>
    </Link>
  );
}
