import { ActionForm } from "@/components/action-form";
import { AdminHeader, Panel, Pill, adminInput, adminLabel } from "@/components/ui";
import type { AdminLocalities } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { saveLocality } from "@/server/manage";

export const metadata = { title: "Localities" };
const KINDS = ["VILLAGE", "TOWN", "CITY", "NEIGHBORHOOD", "BLOCK", "DISTRICT", "STATE", "REGION", "COUNTRY"] as const;
type Loc = { id: string; name: string; slug: string; kind: string; parentId: string | null; description: string | null; isPrimary: boolean };

function Fields({ l, all }: { l?: Loc; all: Loc[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={adminLabel}>Name <input name="name" defaultValue={l?.name} required className={adminInput} /></label>
      <label className={adminLabel}>Slug <input name="slug" defaultValue={l?.slug} placeholder="auto" className={adminInput} /></label>
      <label className={adminLabel}>Kind
        <select name="kind" defaultValue={l?.kind ?? "TOWN"} className={adminInput}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
      </label>
      <label className={adminLabel}>Inside
        <select name="parentId" defaultValue={l?.parentId ?? ""} className={adminInput}>
          <option value="">—</option>
          {all.filter((x) => x.id !== l?.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <label className={adminLabel + " sm:col-span-2"}>Description <textarea name="description" defaultValue={l?.description ?? ""} rows={2} className={adminInput} /></label>
      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" name="isPrimary" defaultChecked={l?.isPrimary} className="size-4 accent-blue-600" /> Primary locality (the home page is about this place)</label>
    </div>
  );
}

export default async function LocalitiesPage() {
  await requireAdmin();
  const all = await (await adminApi()).get<AdminLocalities>("/v1/admin/localities");
  return (
    <>
      <AdminHeader title="Localities" description="The places Udhwa covers. Add towns, villages or neighbourhoods as the platform grows." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {all.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No localities yet. Add the town or village Udhwa covers.</p>}
          {all.map((l) => (
            <details key={l.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                <span className="font-medium">{l.name}</span>
                <Pill>{l.kind.toLowerCase()}</Pill>
                {l.isPrimary && <Pill tone="blue">Primary</Pill>}
                <span className="text-xs text-slate-500">{all.find((p) => p.id === l.parentId)?.name ?? ""}</span>
              </summary>
              <ActionForm action={saveLocality.bind(null, l.id)} className="mt-4"><Fields l={l} all={all} /></ActionForm>
            </details>
          ))}
        </div>
        <Panel title="New locality" className="self-start">
          <ActionForm action={saveLocality.bind(null, null)} submitLabel="Create" resetOnSuccess><Fields all={all} /></ActionForm>
        </Panel>
      </div>
    </>
  );
}
