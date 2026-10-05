import slugifyLib from "slugify";

export function slugify(input: string, fallbackPrefix = "item") {
  const s = slugifyLib(input, { lower: true, strict: true, trim: true }).slice(0, 80).replace(/-+$/g, "");
  if (s.length >= 3) return s;
  return `${fallbackPrefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pageParam(v: string | string[] | undefined) {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function stringParam(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function daysAgo(n: number) {
  return new Date(Date.now() - n * 86400_000);
}

export function safeCallback(v: unknown, fallback = "/account") {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : fallback;
}
