import Link from "next/link";
import { AdminHeader, Pill, adminBtn } from "@/components/ui";
import { Pagination } from "@/components/ui/misc";
import type { AdminCorrectionList } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { CORRECTION_KIND_LABEL, CORRECTION_STATUS } from "@/lib/status";
import { listHref } from "@/lib/utils";
import { formatDateTime, pageParam, stringParam } from "@/lib/utils";
import { CorrectionActions } from "./correction-actions";

export const metadata = { title: "Corrections" };

export default async function CorrectionsPage({ searchParams }: PageProps<"/corrections">) {
  await requireAdmin();
  const sp = await searchParams;
  const closed = stringParam(sp.view) === "closed";
  const page = pageParam(sp.page);
  const focus = stringParam(sp.focus);
  const { total, rows } = await (await adminApi()).get<AdminCorrectionList>("/v1/admin/corrections", { query: { view: closed ? "closed" : undefined, page } });
  return (
    <>
      <AdminHeader title="Corrections" description="Reports of wrong or outdated information. Fix the content, then resolve the report." />
      <nav className="mb-4 flex gap-1">
        <Link href="/corrections" className={!closed ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>Open</Link>
        <Link href="/corrections?view=closed" className={closed ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>Closed</Link>
      </nav>
      {rows.length === 0 && <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">No {closed ? "closed" : "open"} corrections.</p>}
      <ul className="space-y-3">
        {rows.map((c) => {
          const t = c.place ? { kind: "place", id: c.place.id, name: c.place.name } : c.business ? { kind: "business", id: c.business.id, name: c.business.name }
            : c.service ? { kind: "service", id: c.service.id, name: c.service.name } : c.news ? { kind: "news", id: c.news.id, name: c.news.title }
            : c.blog ? { kind: "blog", id: c.blog.id, name: c.blog.title } : { kind: "photo", id: c.photo!.id, name: c.photo!.title };
          return (
            <li key={c.id} id={c.id} className={`rounded-lg border bg-white p-4 ${focus === c.id ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={c.kind === "OWNERSHIP_CLAIM" ? "blue" : "slate"}>{CORRECTION_KIND_LABEL[c.kind]}</Pill>
                <Pill tone={CORRECTION_STATUS[c.status].tone}>{CORRECTION_STATUS[c.status].label}</Pill>
                <Link href={`/${t.kind}/${t.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{t.name}</Link>
                <span className="text-xs text-slate-500">· {t.kind}</span>
                <span className="ml-auto text-xs text-slate-500">{c.user.name ?? c.user.email} · {formatDateTime(c.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm whitespace-pre-line text-slate-800">{c.message}</p>
              {c.suggestedChange && <p className="mt-2 rounded bg-slate-50 px-3 py-2 text-sm text-slate-700"><span className="font-medium">Suggested:</span> {c.suggestedChange}</p>}
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                {c.evidenceUrl && <a href={c.evidenceUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 underline">Evidence link</a>}
                {c.contactPhone && <span>Phone: {c.contactPhone}</span>}
                <span>Email: {c.user.email}</span>
              </div>
              {c.resolutionNote && <p className="mt-2 text-sm text-slate-600"><span className="font-medium">Team note:</span> {c.resolutionNote} {c.resolver ? `— ${c.resolver.name}` : ""}</p>}
              {!closed && <CorrectionActions id={c.id} status={c.status} editHref={`/${t.kind}/${t.id}`} />}
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 20))} makeHref={(p) => listHref("/corrections", { view: closed ? "closed" : undefined, page: p })} />
    </>
  );
}
