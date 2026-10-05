import { AdminHeader, Table, Td, emptyNote } from "@/components/ui";
import { Pagination } from "@/components/ui/misc";
import type { AdminActivity } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { formatDateTime, pageParam } from "@/lib/utils";

export const metadata = { title: "Activity log" };

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  await requireAdmin();
  const page = pageParam((await searchParams).page);
  const { total, rows } = await (await adminApi()).get<AdminActivity>("/v1/admin/activity", { query: { page } });
  return (
    <>
      <AdminHeader title="Activity log" description="Every change made by the team and every community submission." />
      <Table head={["When", "Who", "Action", "What"]} empty={emptyNote(rows.length === 0, "No activity recorded yet.")}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</Td>
            <Td className="text-slate-700">{r.actor?.name ?? r.actor?.email ?? "System"}</Td>
            <Td className="font-mono text-xs text-slate-500">{r.action}</Td>
            <Td>{r.summary}</Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 50))} makeHref={(p) => `/activity${p > 1 ? `?page=${p}` : ""}`} />
    </>
  );
}
