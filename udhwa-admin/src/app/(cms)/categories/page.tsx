import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AdminHeader, Panel, adminBtn, adminInput, adminLabel } from "@/components/ui";
import type { AdminCategories } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { deleteCategory, saveCategory } from "@/server/manage";

export const metadata = { title: "Categories" };
const KINDS = ["PLACE", "BUSINESS", "SERVICE", "NEWS", "BLOG", "PHOTO"] as const;

export default async function CategoriesPage() {
  await requireAdmin();
  const cats = await (await adminApi()).get<AdminCategories>("/v1/admin/categories");
  return (
    <>
      <AdminHeader title="Categories" description="Each content type has its own categories. Deleting one keeps the content (it becomes uncategorised)." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {KINDS.map((k) => (
            <Panel key={k} title={`${k[0]}${k.slice(1).toLowerCase()} categories`}>
              {cats.every((c) => c.kind !== k) && <p className="py-2 text-sm text-slate-500">No categories yet.</p>}
              <ul className="divide-y divide-slate-100">
                {cats.filter((c) => c.kind === k).map((c) => {
                  const used = Object.values(c._count).reduce((a, b) => a + b, 0);
                  return (
                    <li key={c.id} className="py-2">
                      <details>
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="min-w-0 font-medium break-words">{c.name}</span>
                          <span className="min-w-0 text-xs break-all text-slate-400">/{c.slug} · {used} items · order {c.sortOrder}</span>
                          <span className="ml-auto text-xs text-blue-700">Edit</span>
                        </summary>
                        <ActionForm action={saveCategory.bind(null, c.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="kind" value={c.kind} />
                          <input name="name" defaultValue={c.name} className={adminInput} aria-label="Name" />
                          <input name="slug" defaultValue={c.slug} className={adminInput} aria-label="Slug" />
                          <input name="description" defaultValue={c.description ?? ""} placeholder="Description" className={adminInput} aria-label="Description" />
                          <input name="sortOrder" type="number" defaultValue={c.sortOrder} className={adminInput} aria-label="Sort order" />
                        </ActionForm>
                        <div className="mt-2"><ActionButton action={deleteCategory.bind(null, c.id)} confirmText={`Delete “${c.name}”? ${used} items will become uncategorised.`} className={adminBtn.ghost + " text-red-700"}>Delete category</ActionButton></div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>
        <Panel title="New category" className="self-start">
          <ActionForm action={saveCategory.bind(null, null)} submitLabel="Create" resetOnSuccess>
            <label className={adminLabel}>Type
              <select name="kind" className={adminInput}>{KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            </label>
            <label className={adminLabel + " mt-3"}>Name <input name="name" required className={adminInput} /></label>
            <label className={adminLabel + " mt-3"}>Slug <input name="slug" placeholder="auto" className={adminInput} /></label>
            <label className={adminLabel + " mt-3"}>Description <input name="description" className={adminInput} /></label>
            <label className={adminLabel + " mt-3"}>Sort order <input name="sortOrder" type="number" defaultValue={0} className={adminInput} /></label>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
