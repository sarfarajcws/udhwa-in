import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { AdminHeader, Notice, Pill, Table, Td, adminBtn, adminInput } from "@/components/ui";
import { Pagination } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { ENTITIES, isEntityKey, publicPath } from "@/lib/entities";
import type { AdminEntityList } from "@/lib/api-client";
import { adminApi, liveUrl, requireAdmin } from "@/lib/api";
import { CONTENT_STATUS } from "@/lib/status";
import { listHref } from "@/lib/utils";
import { formatDate, pageParam, stringParam } from "@/lib/utils";
import { setEntityStatus } from "@/server/content";
import type { ContentStatus } from "@/lib/api-contract";

const STATUSES: ContentStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];

export async function generateMetadata({ params }: PageProps<"/[entity]">) {
  const { entity } = await params;
  return { title: isEntityKey(entity) ? ENTITIES[entity].plural : "Admin" };
}

export default async function EntityList({ params, searchParams }: PageProps<"/[entity]">) {
  await requireAdmin();
  const { entity } = await params;
  if (!isEntityKey(entity)) notFound();
  const def = ENTITIES[entity];
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const status = STATUSES.includes(stringParam(sp.status) as ContentStatus) ? (stringParam(sp.status) as ContentStatus) : undefined;
  const missing = stringParam(sp.missing);
  const stale = stringParam(sp.stale) === "1";
  const page = pageParam(sp.page);

  const data = await (await adminApi()).get<AdminEntityList>(`/v1/admin/entities/${entity}`, { query: { q, status, missing, stale: stale ? "1" : undefined, page } });
  const { rows, total, pages } = data;
  const counts = STATUSES.map((s) => data.counts[s]);

  return (
    <>
      <AdminHeader
        title={def.plural}
        description={`${total} ${total === 1 ? def.label.toLowerCase() : def.plural.toLowerCase()}${status ? ` · ${CONTENT_STATUS[status].label.toLowerCase()}` : ""}`}
        actions={<Link href={`/${entity}/new`} className={adminBtn.primary}>+ New {def.label.toLowerCase()}</Link>}
      />
      {sp.deleted && <Notice>Deleted.</Notice>}
      {(missing || stale) && <Notice tone="amber">Filtered: {missing ? `missing ${missing}` : "not updated in a year"} · <Link href={`/${entity}`} className="underline">clear</Link></Notice>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Status">
          <Link href={listHref(`/${entity}`, { q })} className={!status ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>Active</Link>
          {STATUSES.map((s, i) => (
            <Link key={s} href={listHref(`/${entity}`, { q, status: s })} className={status === s ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>
              {CONTENT_STATUS[s].label} <span className="text-xs opacity-60">{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <form className="w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder={`Search ${def.plural.toLowerCase()}…`} className={adminInput} aria-label="Search" />
        </form>
      </div>

      <Table
        head={[def.titleField === "name" ? "Name" : "Title", "Status", entity === "photo" ? "Category · Linked to" : "Category", "Updated", ""]}
        empty={rows.length === 0 ? <p className="px-4 py-10 text-center text-slate-500">Nothing here yet.</p> : undefined}
      >
        {rows.map((r) => {
          const st = CONTENT_STATUS[r.status as ContentStatus];
          const scheduled = r.status === "PUBLISHED" && r.publishedAt && (r.publishedAt as Date) > new Date();
          return (
            <tr key={String(r.id)} className="hover:bg-slate-50">
              <Td>
                <div className="flex items-center gap-3">
                  {entity === "photo" && (r.media as { url: string; alt: string } | null) && (
                    <span className="relative size-10 shrink-0 overflow-hidden rounded bg-slate-100">
                      <SmartImage src={(r.media as { url: string }).url} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <Link href={`/${entity}/${r.id}`} className="font-medium text-slate-900 hover:text-blue-700">{String(r[def.titleField])}</Link>
                    {r.slug ? <p className="truncate text-xs text-slate-400">{def.publicBase}/{String(r.slug)}</p> : null}
                  </div>
                </div>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Pill tone={st.tone}>{scheduled ? "Scheduled" : st.label}</Pill>
                  {r.featured ? <Pill tone="blue">Featured</Pill> : null}
                  {"verifiedAt" in r && r.verifiedAt ? <Pill tone="green">Verified</Pill> : null}
                </div>
              </Td>
              <Td className="text-slate-600">{entity === "photo"
                  ? [(r.category as { name: string } | null)?.name, (r.place as { name: string } | null)?.name ?? (r.service as { name: string } | null)?.name].filter(Boolean).join(" · ") || "—"
                  : ((r.category as { name: string } | null)?.name ?? "—")}</Td>
              <Td className="whitespace-nowrap text-slate-500">{formatDate(r.updatedAt as Date)}</Td>
              <Td className="text-right whitespace-nowrap">
                {r.status === "PUBLISHED" ? (
                  <>
                    {!scheduled && <a href={liveUrl(publicPath(entity, { id: String(r.id), slug: r.slug as string }))} target="_blank" rel="noreferrer" className={adminBtn.ghost}>View</a>}
                    <ActionButton action={setEntityStatus.bind(null, entity, String(r.id), "unpublish")} confirmText="Unpublish? It will disappear from the public site." className={adminBtn.ghost}>Unpublish</ActionButton>
                  </>
                ) : r.status !== "ARCHIVED" ? (
                  <ActionButton action={setEntityStatus.bind(null, entity, String(r.id), "publish")} confirmText="Publish this now?" className={adminBtn.ghost}>Publish</ActionButton>
                ) : null}
                <Link href={`/${entity}/${r.id}`} className={adminBtn.ghost}>Edit</Link>
              </Td>
            </tr>
          );
        })}
      </Table>
      <Pagination page={Math.min(page, pages)} pages={pages} makeHref={(p) => listHref(`/${entity}`, { q, status, missing, stale: stale ? "1" : undefined, page: p })} />
    </>
  );
}
