import { notFound } from "next/navigation";
import { EntityForm } from "@/components/entity-form";
import { AdminHeader } from "@/components/ui";
import { ENTITIES, isEntityKey } from "@/lib/entities";
import type { AdminEntityMeta } from "@/lib/api-client";
import { adminApi, getProviders, requireAdmin, WEB_URL } from "@/lib/api";
import { saveEntity } from "@/server/content";

export const metadata = { title: "New" };

export default async function NewEntity({ params }: PageProps<"/[entity]/new">) {
  await requireAdmin();
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();
  const def = ENTITIES[entity];
  const [{ options, library, initial }, providers] = await Promise.all([(await adminApi()).get<AdminEntityMeta>(`/v1/admin/entities/${entity}/new`), getProviders()]);
  return (
    <>
      <AdminHeader title={`New ${def.label.toLowerCase()}`} back={{ href: `/${entity}`, label: def.plural }} />
      <EntityForm entity={entity} action={saveEntity.bind(null, entity, null)} initial={initial} options={options} library={library} uploadsEnabled={providers.uploads} isNew siteUrl={WEB_URL} />
    </>
  );
}
