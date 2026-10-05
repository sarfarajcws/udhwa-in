import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { AdminHeader, Pill, adminBtn } from "@/components/ui";
import type { AdminMessages } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { formatDateTime, stringParam } from "@/lib/utils";
import { setMessageStatus } from "@/server/manage";
import type { MessageStatus } from "@/lib/api-contract";

export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  await requireAdmin();
  const view = (stringParam((await searchParams).view)?.toUpperCase() ?? "NEW") as MessageStatus;
  const status: MessageStatus = ["NEW", "READ", "ARCHIVED"].includes(view) ? view : "NEW";
  const rows = await (await adminApi()).get<AdminMessages>("/v1/admin/messages", { query: { status } });
  return (
    <>
      <AdminHeader title="Messages" description="From the contact form." />
      <nav className="mb-4 flex gap-1">
        {(["NEW", "READ", "ARCHIVED"] as const).map((s) => (
          <Link key={s} href={`/messages?view=${s.toLowerCase()}`} className={s === status ? adminBtn.secondary + " !bg-slate-900 !text-white" : adminBtn.ghost}>{s[0] + s.slice(1).toLowerCase()}</Link>
        ))}
      </nav>
      {rows.length === 0 && <p className="rounded-lg border border-slate-200 bg-white px-4 py-10 text-center text-slate-500">No messages.</p>}
      <ul className="space-y-3">
        {rows.map((m) => (
          <li key={m.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              {m.status === "NEW" && <Pill tone="amber">New</Pill>}
              <span className="font-semibold">{m.subject}</span>
              <span className="ml-auto text-xs text-slate-500">{formatDateTime(m.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {m.name} · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-blue-700 underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}
            </p>
            <p className="mt-3 text-sm whitespace-pre-line text-slate-800">{m.message}</p>
            <div className="mt-3 flex gap-2">
              {m.status !== "READ" && <ActionButton action={setMessageStatus.bind(null, m.id, "READ")} className={adminBtn.secondary}>Mark read</ActionButton>}
              {m.status !== "ARCHIVED" && <ActionButton action={setMessageStatus.bind(null, m.id, "ARCHIVED")} className={adminBtn.ghost}>Archive</ActionButton>}
              {m.status === "ARCHIVED" && <ActionButton action={setMessageStatus.bind(null, m.id, "NEW")} className={adminBtn.ghost}>Move to inbox</ActionButton>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
