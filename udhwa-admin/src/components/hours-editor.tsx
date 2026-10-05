"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminBtn } from "./ui";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
type Slot = { days: string[]; opens: string; closes: string };

function parse(s: string): Slot[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Structured opening hours → used for display and LocalBusiness structured data. */
export function HoursEditor({ name, initial }: { name: string; initial: string }) {
  const [slots, setSlots] = useState<Slot[]>(parse(initial));
  const update = (i: number, patch: Partial<Slot>) => setSlots((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={slots.length ? JSON.stringify(slots.filter((s) => s.days.length)) : ""} />
      {slots.map((slot, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-2">
          <div className="flex gap-1">
            {DAYS.map((d) => {
              const on = slot.days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => update(i, { days: on ? slot.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || slot.days.includes(x)) })}
                  className={`h-7 w-8 rounded text-xs font-semibold ${on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <input type="time" value={slot.opens} onChange={(e) => update(i, { opens: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" aria-label="Opens" />
          <span className="text-slate-400">–</span>
          <input type="time" value={slot.closes} onChange={(e) => update(i, { closes: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-sm" aria-label="Closes" />
          <button type="button" onClick={() => setSlots((s) => s.filter((_, j) => j !== i))} className={adminBtn.ghost} aria-label="Remove"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button type="button" className={adminBtn.secondary} onClick={() => setSlots((s) => [...s, { days: s.length ? [] : [...DAYS], opens: "09:00", closes: "18:00" }])}>
        <Plus className="size-4" /> Add hours
      </button>
    </div>
  );
}
