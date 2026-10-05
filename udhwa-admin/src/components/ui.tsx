import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="text-sm text-slate-500 hover:text-slate-900">
          ← {back.label}
        </Link>
      )}
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <div className="mt-1 text-slate-500">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white", className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Message shown under an empty table (pass as Table's `empty`). */
export function emptyNote(show: boolean, text = "Nothing here yet.") {
  return show ? <p className="px-4 py-10 text-center text-sm text-slate-500">{text}</p> : undefined;
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function Pill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "blue" | "amber" | "green" | "red" | "neutral" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700", neutral: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-100", green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100", red: "bg-red-50 text-red-700 ring-1 ring-red-100",
  };
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone])}>{children}</span>;
}

export const adminBtn = {
  primary: "inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50",
  secondary: "inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  danger: "inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50",
  ghost: "inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50",
};

export const adminInput = "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none";
export const adminLabel = "mb-1 block text-sm font-medium text-slate-700";

export function Stat({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: "amber" }) {
  const inner = (
    <>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "amber" && Number(value) > 0 ? "text-amber-700" : "text-slate-900")}>{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300">{inner}</Link>
  ) : (
    <div className="rounded-lg border border-slate-200 bg-white p-4">{inner}</div>
  );
}

export function Notice({ tone = "green", children }: { tone?: "green" | "red" | "amber" | "blue"; children: ReactNode }) {
  const tones = { green: "border-emerald-200 bg-emerald-50 text-emerald-800", red: "border-red-200 bg-red-50 text-red-800", amber: "border-amber-200 bg-amber-50 text-amber-800", blue: "border-blue-200 bg-blue-50 text-blue-800" };
  return <div className={cn("mb-4 rounded-md border px-3 py-2 text-sm", tones[tone])} role="status">{children}</div>;
}
