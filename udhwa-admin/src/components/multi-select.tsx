"use client";

import { X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Option } from "@/lib/api-client";
import { adminInput } from "./ui";

/** Pick several items (e.g. related blogs) with a filter box; submits one hidden input per chosen id. */
export function MultiSelect({ id, name, options, initial, max }: { id: string; name: string; options: Option[]; initial: string[]; max?: number }) {
  const [chosen, setChosen] = useState<string[]>(initial.filter((v) => options.some((o) => o.value === v)));
  const [filter, setFilter] = useState("");
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const shown = useMemo(
    () => options.filter((o) => !chosen.includes(o.value) && (!filter || o.label.toLowerCase().includes(filter.toLowerCase()))).slice(0, 50),
    [options, chosen, filter],
  );
  const full = max !== undefined && chosen.length >= max;

  return (
    <div>
      {chosen.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      {chosen.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {chosen.map((v) => (
            <li key={v} className="inline-flex max-w-full items-center gap-1 rounded-full bg-blue-50 py-1 pr-1 pl-3 text-sm text-blue-800">
              <span className="truncate">{label(v)}</span>
              <button type="button" onClick={() => setChosen((c) => c.filter((x) => x !== v))} className="rounded-full p-0.5 hover:bg-blue-100" aria-label={`Remove ${label(v)}`}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-xs text-slate-500">Maximum {max} selected. Remove one to add another.</p>
      ) : (
        <>
          <input id={id} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={options.length ? "Search to add…" : "Nothing to choose yet"} className={adminInput} disabled={!options.length} />
          {(filter || chosen.length === 0) && shown.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white">
              {shown.map((o) => (
                <li key={o.value}>
                  <button type="button" onClick={() => { setChosen((c) => [...c, o.value]); setFilter(""); }} className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {o.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {filter && shown.length === 0 && <p className="mt-1 text-xs text-slate-500">No match.</p>}
        </>
      )}
    </div>
  );
}
