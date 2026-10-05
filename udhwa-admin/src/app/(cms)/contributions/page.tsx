import Link from "next/link";
import { AdminHeader, Pill, Table, Td, adminBtn } from "@/components/ui";
import { Pagination } from "@/components/ui/misc";
import type { AdminContributionList } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { CONTRIBUTION_STATUS, CONTRIBUTION_TYPE_LABEL } from "@/lib/status";
import { listHref } from "@/lib/utils";
import { formatDate, pageParam, stringParam } from "@/lib/utils";
import type { ContributionStatus, ContributionType } from "@/lib/api-contract";

export const metadata = { title: "Contributions" };
const TABS: { key: string; label: string; statuses: ContributionStatus[] }[] = [
  { key: "open", label: "To review", statuses: ["SUBMITTED", "UNDER_REVIEW"] },
  { key: "waiting", label: "Waiting on contributor", statuses: ["CHANGES_REQUESTED"] },
  { key: "approved", label: "Approved (draft)", statuses: ["APPROVED"] },
  { key: "done", label: "Closed", statuses: ["PUBLISHED", "REJECTED", "WITHDRAWN"] },
];
const TYPES = Object.keys(CONTRIBUTION_TYPE_LABEL) as ContributionType[];

export default async function ContributionsPage({ searchParams }: PageProps<"/contributions">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === stringParam(sp.tab)) ?? TABS[0];
  const type = TYPES.includes(stringParam(sp.type) as ContributionType) ? (stringParam(sp.type) as ContributionType) : undefined;
  const page = pageParam(sp.page);
  const data = await (await adminApi()).get<AdminContributionList>("/v1/admin/contributions", { query: { tab: tab.key, type, page } });
  const { total, rows } = data;
  const counts = TABS.map((t) => data.counts[t.key] ?? 0);
  return (
    <>
      <AdminHeader title="Contributions" description="Community submissions. Oldest first — nothing gets published without review." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t, i) => (
            <Link key={t.key} href={listHref("/contributions", { tab: t.key, type })} className={t.key === tab.key ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>
              {t.label} <span className="text-xs opacity-60">{counts[i]}</span>
            </Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-1 text-xs">
          <Link href={listHref("/contributions", { tab: tab.key })} className={!type ? "font-semibold text-slate-900" : "text-slate-500"}>All types</Link>
          {TYPES.map((t) => (
            <Link key={t} href={listHref("/contributions", { tab: tab.key, type: t })} className={type === t ? "ml-2 font-semibold text-slate-900" : "ml-2 text-slate-500 hover:text-slate-900"}>{CONTRIBUTION_TYPE_LABEL[t]}</Link>
          ))}
        </nav>
      </div>
      <Table head={["Submission", "Type", "Contributor", "Submitted", "Status"]} empty={rows.length === 0 ? <p className="px-4 py-10 text-center text-slate-500">Nothing here.</p> : undefined}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50">
            <Td><Link href={`/contributions/${c.id}`} className="font-medium text-slate-900 hover:text-blue-700">{c.title}</Link></Td>
            <Td className="text-slate-600">{CONTRIBUTION_TYPE_LABEL[c.type]}</Td>
            <Td className="text-slate-600">{c.user.name ?? c.user.email}</Td>
            <Td className="whitespace-nowrap text-slate-500">{formatDate(c.submittedAt)}</Td>
            <Td><Pill tone={CONTRIBUTION_STATUS[c.status].tone}>{CONTRIBUTION_STATUS[c.status].label}</Pill>{c.reviewer && <span className="ml-2 text-xs text-slate-400">{c.reviewer.name}</span>}</Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 25))} makeHref={(p) => listHref("/contributions", { tab: tab.key, type, page: p })} />
    </>
  );
}
