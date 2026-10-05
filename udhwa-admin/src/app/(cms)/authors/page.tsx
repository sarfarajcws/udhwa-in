import { ActionForm } from "@/components/action-form";
import { AdminHeader, Panel, adminInput, adminLabel } from "@/components/ui";
import type { AdminAuthors } from "@/lib/api-client";
import { adminApi, requireAdmin, WEB_URL } from "@/lib/api";
import { saveAuthor } from "@/server/manage";

export const metadata = { title: "Authors" };

function Fields({ a }: { a?: { name: string; slug: string; bio: string | null; avatarUrl: string | null; user: { email: string | null } | null } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={adminLabel}>Name <input name="name" defaultValue={a?.name} required className={adminInput} /></label>
      <label className={adminLabel}>Slug <input name="slug" defaultValue={a?.slug} placeholder="auto" className={adminInput} /></label>
      <label className={adminLabel + " sm:col-span-2"}>Bio <textarea name="bio" defaultValue={a?.bio ?? ""} rows={2} maxLength={500} className={adminInput} /></label>
      <label className={adminLabel}>Avatar URL <input name="avatarUrl" defaultValue={a?.avatarUrl ?? ""} placeholder="https://…" className={adminInput} /></label>
      <label className={adminLabel}>Linked user email <input name="userEmail" defaultValue={a?.user?.email ?? ""} placeholder="optional" className={adminInput} /></label>
    </div>
  );
}

export default async function AuthorsPage() {
  await requireAdmin();
  const authors = await (await adminApi()).get<AdminAuthors>("/v1/admin/authors");
  return (
    <>
      <AdminHeader title="Authors" description="Public bylines for news and blogs. Contributors get one automatically when their blog is approved." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {authors.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">No authors yet.</p>}
          {authors.map((a) => (
            <details key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className="min-w-0 font-medium break-words">{a.name}</span>
                <span className="min-w-0 text-xs break-all text-slate-500">{a._count.news} news · {a._count.blogs} blogs{a.user?.email ? ` · ${a.user.email}` : ""}</span>
                <a href={`${WEB_URL}/authors/${a.slug}`} target="_blank" rel="noreferrer" className="ml-auto text-xs text-blue-700">View</a>
              </summary>
              <ActionForm action={saveAuthor.bind(null, a.id)} className="mt-4"><Fields a={a} /></ActionForm>
            </details>
          ))}
        </div>
        <Panel title="New author" className="self-start">
          <ActionForm action={saveAuthor.bind(null, null)} submitLabel="Create" resetOnSuccess><Fields /></ActionForm>
        </Panel>
      </div>
    </>
  );
}
