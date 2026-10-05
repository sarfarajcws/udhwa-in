import { notFound } from "next/navigation";
import { CoverFigure } from "@/components/cover-figure";
import { ENTITIES, isEntityKey } from "@/lib/entities";
import { orNull, type AdminPreview } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { RichContent } from "@/components/ui/rich-content";
import { isDocEmpty } from "@/lib/rich-text/schema";

export const metadata = { title: "Preview", robots: { index: false } };

/** Admin-only preview of unpublished content using the public typography. */
export default async function PreviewPage({ params }: PageProps<"/preview/[entity]/[id]">) {
  await requireAdmin();
  const { entity, id } = await params;
  if (!isEntityKey(entity) || entity === "photo") notFound();
  const def = ENTITIES[entity];
  const row = (await orNull((await adminApi()).get<AdminPreview>(`/v1/admin/entities/${entity}/${encodeURIComponent(id)}/preview`))) as Record<string, unknown> | null;
  if (!row) notFound();
  const body = row.content ?? row.about ?? row.description;
  const summary = (row.excerpt ?? row.summary) as string;
  return (
    <div className="-mx-4 -my-6 bg-canvas px-4 py-10 sm:-mx-6 lg:-mx-8">
      <div className="mx-auto max-w-[44rem] font-sans text-ink">
        <p className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Preview — {String(row.status).toLowerCase()} {def.label.toLowerCase()}. Not visible to the public until published.</p>
        <h1 className="text-[2.2rem] leading-tight font-bold tracking-tight">{String(row[def.titleField])}</h1>
        {summary && <p className="mt-4 text-lg text-muted">{summary}</p>}
        {row.cover ? <div className="mt-8"><CoverFigure media={row.cover as { url: string; alt: string }} /></div> : null}
        {!isDocEmpty(body) && <div className="mt-8" lang={(row.language as string) ?? undefined}><RichContent doc={body} /></div>}
        {!isDocEmpty(row.history) && (<><h2 className="mt-10 text-xl font-bold">History</h2><RichContent doc={row.history} className="prose-udhwa mt-3" /></>)}
      </div>
    </div>
  );
}
