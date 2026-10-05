import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AdminHeader, Table, Td, adminBtn, adminInput, emptyNote } from "@/components/ui";
import type { AdminTags } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { deleteTag, renameTag } from "@/server/manage";

export const metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireAdmin();
  const tags = await (await adminApi()).get<AdminTags>("/v1/admin/tags");
  return (
    <>
      <AdminHeader title="Tags" description="Tags are created from the content editor. Rename or remove them here." />
      <Table head={["Tag", "Used in", ""]} empty={emptyNote(tags.length === 0, "No tags yet. Tags are created from news, blog and photo forms.")}>
        {tags.map((t) => (
          <tr key={t.id}>
            <Td>
              <ActionForm action={renameTag.bind(null, t.id)} className="flex items-center gap-2 [&>div]:mt-0" submitLabel="Rename">
                <input name="name" defaultValue={t.name} className={adminInput + " max-w-xs"} aria-label="Tag name" />
              </ActionForm>
              <p className="mt-1 text-xs text-slate-400">#{t.slug}</p>
            </Td>
            <Td className="text-slate-600">{t._count.news} news · {t._count.blogs} blogs · {t._count.photos} photos</Td>
            <Td className="text-right"><ActionButton action={deleteTag.bind(null, t.id)} confirmText={`Delete tag “${t.name}”?`} className={adminBtn.ghost + " text-red-700"}>Delete</ActionButton></Td>
          </tr>
        ))}
      </Table>
    </>
  );
}
