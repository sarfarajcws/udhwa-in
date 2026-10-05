import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AdminHeader, Panel, Pill, Table, Td, adminBtn, adminInput, adminLabel, emptyNote } from "@/components/ui";
import type { AdminRedirects } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { deleteRedirect, saveRedirect } from "@/server/manage";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  await requireAdmin();
  const rows = await (await adminApi()).get<AdminRedirects>("/v1/admin/redirects");
  return (
    <>
      <AdminHeader title="Redirects" description="Created automatically when a slug changes. Legacy udhwa.in .html URLs are redirected too." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Table head={["From", "To", "Type", "Added", ""]} empty={emptyNote(rows.length === 0, "No redirects yet.")}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td className="font-mono text-xs">{r.fromPath}</Td>
              <Td className="font-mono text-xs">{r.toPath}</Td>
              <Td><Pill>{r.permanent ? "308" : "307"}</Pill></Td>
              <Td className="text-slate-500">{formatDate(r.createdAt)}</Td>
              <Td className="text-right"><ActionButton action={deleteRedirect.bind(null, r.id)} confirmText="Delete this redirect?" className={adminBtn.ghost + " text-red-700"}>Delete</ActionButton></Td>
            </tr>
          ))}
        </Table>
        <Panel title="Add redirect" className="self-start">
          <ActionForm action={saveRedirect} submitLabel="Add" resetOnSuccess>
            <label className={adminLabel}>From path <input name="fromPath" placeholder="/old-page" required className={adminInput} /></label>
            <label className={adminLabel + " mt-3"}>To path <input name="toPath" placeholder="/places/new" required className={adminInput} /></label>
            <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="permanent" defaultChecked className="size-4 accent-blue-600" /> Permanent</label>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
