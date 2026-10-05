import { db } from "@/db";
import type { EntityDef, OptionSource } from "@/lib/entities";

export type Option = { value: string; label: string };
export type OptionMap = Partial<Record<OptionSource, Option[]>>;
export type LibraryItem = { id: string; url: string; alt: string; width: number | null; height: number | null };

/** Loads only the option lists an entity form actually uses. */
export async function loadOptions(def: EntityDef): Promise<OptionMap> {
  const sources = new Set(def.fields.map((f) => (typeof f.options === "string" ? f.options : null)).filter(Boolean) as OptionSource[]);
  const out: OptionMap = {};
  const label = (s: string) => (s.length > 70 ? `${s.slice(0, 69)}…` : s);
  await Promise.all(
    [...sources].map(async (src) => {
      switch (src) {
        case "category":
          out.category = (await db.category.findMany({ where: { kind: def.categoryKind ?? "PHOTO" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })).map((c) => ({ value: c.id, label: c.name }));
          break;
        case "locality":
          out.locality = (await db.locality.findMany({ orderBy: { name: "asc" }, include: { parent: { select: { name: true } } } })).map((l) => ({ value: l.id, label: l.parent ? `${l.name}, ${l.parent.name}` : l.name }));
          break;
        case "place":
          out.place = (await db.place.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((r) => ({ value: r.id, label: r.name }));
          break;
        case "business":
          out.business = (await db.business.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((r) => ({ value: r.id, label: r.name }));
          break;
        case "service":
          out.service = (await db.service.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true } })).map((r) => ({ value: r.id, label: r.name }));
          break;
        case "author":
          out.author = (await db.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })).map((r) => ({ value: r.id, label: r.name }));
          break;
        case "news":
          out.news = (await db.newsArticle.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true } })).map((r) => ({ value: r.id, label: label(r.title) }));
          break;
        case "blog":
          out.blog = (await db.blogPost.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true } })).map((r) => ({ value: r.id, label: label(r.title) }));
          break;
      }
    }),
  );
  return out;
}

export async function loadLibrary(): Promise<LibraryItem[]> {
  return db.media.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: { id: true, url: true, alt: true, width: true, height: true },
  });
}

/** Date → "YYYY-MM-DDTHH:mm" in IST for <input type="datetime-local">. */
export function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const ist = new Date(d.getTime() + 5.5 * 3600_000);
  return ist.toISOString().slice(0, 16);
}

/** Serialises a DB row into plain form values for the client form. */
export function toFormValues(def: EntityDef, row: Record<string, unknown>) {
  const values: Record<string, unknown> = {};
  for (const f of def.fields) {
    const v = row[f.name];
    if (f.type === "datetime") values[f.name] = toLocalInput(v as Date | null);
    else if (f.type === "tags") values[f.name] = ((row.tags as { name: string }[] | undefined) ?? []).map((t) => t.name).join(", ");
    else if (f.type === "list") values[f.name] = ((v as string[] | undefined) ?? []).join("\n");
    else if (f.type === "hours") values[f.name] = v ? JSON.stringify(v) : "";
    else if (f.type === "number") values[f.name] = v ?? "";
    else values[f.name] = v ?? (f.type === "checkbox" ? false : f.type === "rich" ? null : "");
  }
  return values;
}
