import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { EntityForm } from "@/components/entity-form";
import { AdminHeader, Notice, Panel, Pill, adminBtn } from "@/components/ui";
import { orNull, type AdminEntity } from "@/lib/api-client";
import { ENTITIES, isEntityKey } from "@/lib/entities";
import { adminApi, getProviders, liveUrl, requireAdmin, WEB_URL } from "@/lib/api";
import { CONTENT_STATUS, CONTRIBUTION_STATUS, CORRECTION_KIND_LABEL, CORRECTION_STATUS } from "@/lib/status";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { deleteEntity, saveEntity, setEntityStatus } from "@/server/content";

export const metadata = { title: "Edit" };

export default async function EditEntity({ params, searchParams }: PageProps<"/[entity]/[id]">) {
  await requireAdmin();
  const { entity, id } = await params;
  if (!isEntityKey(entity)) notFound();
  const sp = await searchParams;
  const def = ENTITIES[entity];
  const [data, providers] = await Promise.all([orNull((await adminApi()).get<AdminEntity>(`/v1/admin/entities/${entity}/${encodeURIComponent(id)}`)), getProviders()]);
  if (!data) notFound();
  const { row, values, options, library, contributions, corrections, history } = data;

  const status = row.status;
  const st = CONTENT_STATUS[status];
  const live = liveUrl(row.publicPath);
  const scheduled = status === "PUBLISHED" && row.publishedAt && row.publishedAt > new Date();
  const openCorrections = corrections.filter((c) => c.status === "OPEN" || c.status === "IN_REVIEW");

  return (
    <>
      <AdminHeader
        title={row.title}
        back={{ href: `/${entity}`, label: def.plural }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Pill tone={st.tone}>{scheduled ? `Scheduled · ${formatDateTime(row.publishedAt)}` : st.label}</Pill>
            <span>Updated {relativeTime(row.updatedAt)}</span>
          </span>
        }
        actions={
          <>
            {status === "PUBLISHED" && !scheduled && <a href={live} target="_blank" rel="noreferrer" className={adminBtn.secondary}>View live ↗</a>}
            {entity !== "photo" && <Link href={`/preview/${entity}/${id}`} target="_blank" className={adminBtn.secondary}>Preview</Link>}
            {status === "PUBLISHED" && <ActionButton action={setEntityStatus.bind(null, entity, id, "unpublish")} confirmText="Unpublish? It will be removed from the public site." className={adminBtn.secondary}>Unpublish</ActionButton>}
            {status === "DRAFT" && <ActionButton action={setEntityStatus.bind(null, entity, id, "review")} className={adminBtn.secondary}>Mark in review</ActionButton>}
            {status !== "ARCHIVED" ? (
              <ActionButton action={setEntityStatus.bind(null, entity, id, "archive")} confirmText="Archive this? It will be hidden everywhere but kept." className={adminBtn.secondary}>Archive</ActionButton>
            ) : (
              <ActionButton action={setEntityStatus.bind(null, entity, id, "restore")} className={adminBtn.secondary}>Restore as draft</ActionButton>
            )}
            <ActionButton action={deleteEntity.bind(null, entity, id)} confirmText="Permanently delete this? This cannot be undone." className={adminBtn.danger}>Delete</ActionButton>
          </>
        }
      />
      {sp.created && <Notice>Created as a draft. Publish when it’s ready.</Notice>}
      {sp.fromContribution && <Notice tone="blue">Draft created from a community contribution. Review, complete and publish it — the contributor will see it as published.</Notice>}
      {openCorrections.length > 0 && (
        <Notice tone="amber">
          {openCorrections.length} open correction{openCorrections.length === 1 ? "" : "s"} reported on this item — see below the form.
        </Notice>
      )}

      <EntityForm
        entity={entity}
        action={saveEntity.bind(null, entity, id)}
        initial={values}
        options={options}
        library={library}
        uploadsEnabled={providers.uploads}
        verified={row.verified}
        isNew={false}
        status={st.label}
        siteUrl={WEB_URL}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {(corrections.length > 0 || contributions.length > 0) && (
          <Panel title="Community input">
            <ul className="space-y-3 text-sm">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <Link href={`/contributions/${c.id}`} className="text-blue-700 hover:underline">Contribution by {c.user.name ?? c.user.email}</Link>
                  <Pill tone={CONTRIBUTION_STATUS[c.status].tone}>{CONTRIBUTION_STATUS[c.status].label}</Pill>
                </li>
              ))}
              {corrections.map((c) => (
                <li key={c.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{CORRECTION_KIND_LABEL[c.kind]} · {c.user.name}</span>
                    <Pill tone={CORRECTION_STATUS[c.status].tone}>{CORRECTION_STATUS[c.status].label}</Pill>
                  </div>
                  <p className="mt-1 text-slate-700">{c.message}</p>
                  {c.suggestedChange && <p className="mt-1 text-slate-500">Suggested: {c.suggestedChange}</p>}
                  {(c.status === "OPEN" || c.status === "IN_REVIEW") && (
                    <Link href={`/corrections?focus=${c.id}#${c.id}`} className="mt-1 inline-block text-xs text-blue-700">Resolve →</Link>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}
        <Panel title="History">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">No recorded changes yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="text-slate-800">{h.summary}</span>
                  <span className="block text-xs text-slate-500">{h.actor?.name ?? "System"} · {formatDateTime(h.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
