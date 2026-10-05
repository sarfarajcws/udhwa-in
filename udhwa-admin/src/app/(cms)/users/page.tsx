import { ActionButton } from "@/components/action-button";
import { AdminHeader, Notice, Pill, Table, Td, adminBtn, adminInput, emptyNote } from "@/components/ui";
import { Pagination } from "@/components/ui/misc";
import type { AdminUserList } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { listHref } from "@/lib/utils";
import { formatDate, pageParam, stringParam } from "@/lib/utils";
import { setUserStatus } from "@/server/manage";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = stringParam(sp.q);
  const page = pageParam(sp.page);
  const { total, users } = await (await adminApi()).get<AdminUserList>("/v1/admin/users", { query: { q, page } });
  return (
    <>
      <AdminHeader title="Users" description={`${total} accounts. Users can only contribute; admins manage published content.`} />
      <Notice tone="blue">
        Admin access is controlled by the server: only Google accounts listed in the API’s <code>ADMIN_EMAILS</code> setting are admins, and
        removing an email there revokes access on the next request. Here you can suspend or reactivate accounts.
      </Notice>
      <form className="mb-4 max-w-sm"><input name="q" defaultValue={q} placeholder="Search name, email, username" className={adminInput} aria-label="Search users" /></form>
      <Table head={["User", "Role", "Activity", "Joined", ""]} empty={emptyNote(users.length === 0, q ? `No users match “${q}”.` : "No users yet.")}>
        {users.map((u) => (
          <tr key={u.id}>
            <Td>
              <p className="font-medium">{u.name ?? "—"} {u.id === me.id && <span className="text-xs text-slate-400">(you)</span>}</p>
              <p className="text-xs text-slate-500">{u.email}{u.username ? ` · @${u.username}` : ""}</p>
            </Td>
            <Td>
              <div className="flex gap-1">
                <Pill tone={u.role === "ADMIN" ? "blue" : "slate"}>{u.role === "ADMIN" ? "Admin" : "User"}</Pill>
                {u.status === "SUSPENDED" && <Pill tone="red">Suspended</Pill>}
              </div>
            </Td>
            <Td className="text-slate-600">{u._count.contributions} contributions · {u._count.corrections} corrections</Td>
            <Td className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</Td>
            <Td className="text-right whitespace-nowrap">
              {u.id !== me.id && (
                <>
                  {u.status === "ACTIVE" ? (
                    <ActionButton action={setUserStatus.bind(null, u.id, "SUSPENDED")} confirmText="Suspend this account? They won’t be able to sign in or contribute." className={adminBtn.ghost + " text-red-700"}>Suspend</ActionButton>
                  ) : (
                    <ActionButton action={setUserStatus.bind(null, u.id, "ACTIVE")} className={adminBtn.ghost}>Reactivate</ActionButton>
                  )}
                </>
              )}
            </Td>
          </tr>
        ))}
      </Table>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 30))} makeHref={(p) => listHref("/users", { q, page: p })} />
    </>
  );
}
