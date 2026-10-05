import { z } from "zod";
import { isDocEmpty, sanitizeDoc } from "@/lib/rich-text/schema";
import { slugify } from "@/lib/utils";
import type { EntityDef, FieldDef } from "@/lib/entities";

/**
 * Parses an admin submission (a flat object of field values — what an HTML
 * form produces, or what any API client sends) against an entity definition.
 * Everything is validated server-side; clients are never trusted.
 */

export type ParseResult =
  | { ok: true; data: Record<string, unknown>; tags: string[] | null }
  | { ok: false; fieldErrors: Record<string, string[]> };

const ID = /^[a-z0-9]{20,40}$/i;
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

const hoursSchema = z
  .array(
    z.object({
      days: z.array(z.enum(DAYS)).min(1),
      opens: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      closes: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/),
    }),
  )
  .max(7);

type Input = Record<string, unknown>;

/** Normalises JSON values to the strings a form would send. */
function asString(v: unknown) {
  if (v === true) return "on";
  if (v === false || v === null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function parseField(f: FieldDef, rawValue: unknown, all: Input): { value?: unknown; error?: string } {
  const raw = asString(rawValue);
  const str = raw.trim();
  const empty = str === "";

  switch (f.type) {
    case "checkbox":
      return { value: raw === "on" || raw === "true" };
    case "rich": {
      const doc = sanitizeDoc(str || null);
      if (f.required && isDocEmpty(doc)) return { error: `${f.label} is required` };
      if (JSON.stringify(doc).length > 500_000) return { error: "Content is too long" };
      return { value: isDocEmpty(doc) && !f.required ? null : doc };
    }
    case "number": {
      if (empty) return { value: null };
      const n = Number(str);
      if (!Number.isFinite(n)) return { error: "Must be a number" };
      if (f.name === "latitude" && (n < -90 || n > 90)) return { error: "Latitude must be between -90 and 90" };
      if (f.name === "longitude" && (n < -180 || n > 180)) return { error: "Longitude must be between -180 and 180" };
      return { value: n };
    }
    case "datetime": {
      if (empty) return { value: null };
      const d = new Date(str.length === 16 ? `${str}:00+05:30` : str);
      return Number.isNaN(d.getTime()) ? { error: "Invalid date" } : { value: d };
    }
    case "media":
    case "select": {
      if (empty) return f.required ? { error: `${f.label} is required` } : { value: null };
      if (Array.isArray(f.options)) {
        return f.options.some((o) => o.value === str) ? { value: str } : { error: "Invalid choice" };
      }
      return ID.test(str) ? { value: str } : { error: "Invalid selection" };
    }
    case "list": {
      const items = str.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 30).map((s) => s.slice(0, 80));
      return { value: items };
    }
    case "tags":
      return { value: str };
    case "hours": {
      if (empty) return { value: null };
      try {
        const parsed = hoursSchema.parse(JSON.parse(str));
        return { value: parsed.length ? parsed : null };
      } catch {
        return { error: "Invalid opening hours" };
      }
    }
    case "slug": {
      const titleRaw = all.name ?? all.title;
      const base = empty ? (typeof titleRaw === "string" ? titleRaw : "") : str;
      const s = slugify(base);
      return { value: s };
    }
    default: {
      if (empty) return f.required ? { error: `${f.label} is required` } : { value: null };
      if (f.max && str.length > f.max) return { error: `Keep it under ${f.max} characters` };
      if (f.type === "url" && !/^https?:\/\/[^\s]+$/i.test(str)) return { error: "Enter a full URL starting with https://" };
      if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return { error: "Enter a valid email" };
      if (f.type === "tel" && !/^[+\d][\d\s-]{6,}$/.test(str)) return { error: "Enter a valid phone number" };
      return { value: str };
    }
  }
}

export function parseEntityForm(def: EntityDef, input: Input): ParseResult {
  const data: Record<string, unknown> = {};
  const fieldErrors: Record<string, string[]> = {};
  let tags: string[] | null = null;

  for (const f of def.fields) {
    const { value, error } = parseField(f, input[f.name], input);
    if (error) {
      fieldErrors[f.name] = [error];
      continue;
    }
    if (f.type === "tags") {
      tags = String(value ?? "")
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 15)
        .map((t) => t.slice(0, 40));
      continue;
    }
    data[f.name] = value;
  }

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, data, tags };
}
