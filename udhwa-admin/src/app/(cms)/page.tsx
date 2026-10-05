import Link from "next/link";
import { AdminHeader, Panel, Pill, Stat } from "@/components/ui";
import { ENTITIES } from "@/lib/entities";
import type { AdminDashboard } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { CONTRIBUTION_STATUS, CONTRIBUTION_TYPE_LABEL } from "@/lib/status";
import { relativeTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await requireAdmin();
  const { pending, recentContributions, openCorrections, newMessages, activity, contentCounts, health } = await (await adminApi()).get<AdminDashboard>("/v1/admin/dashboard");
  const { placesNoCover, bizNoCover, bizNoPhone, bizUnverified, newsNoSource, stalePlaces, staleBiz, mediaNoAlt } = health;
  const healthItems = [
    { label: "Published places without a photo", value: placesNoCover, href: "/place?missing=cover" },
    { label: "Published businesses without a photo", value: bizNoCover, href: "/business?missing=cover" },
    { label: "Businesses without a phone number", value: bizNoPhone, href: "/business?missing=phone" },
    { label: "Businesses not yet verified", value: bizUnverified, href: "/business?missing=verified" },
    { label: "News without a source", value: newsNoSource, href: "/news?missing=source" },
    { label: "Places not updated in a year", value: stalePlaces, href: "/place?stale=1" },
    { label: "Businesses not updated in a year", value: staleBiz, href: "/business?stale=1" },
    { label: "Images without alt text", value: mediaNoAlt, href: "/media?missing=alt" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" description="What needs attention across Udhwa." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Contributions to review" value={pending} href="/contributions" tone="amber" />
        <Stat label="Open corrections" value={openCorrections} href="/corrections" tone="amber" />
        <Stat label="New messages" value={newMessages} href="/messages" tone="amber" />
        <Stat label="Published items" value={contentCounts.reduce((a, c) => a + c.published, 0)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Review queue" actions={<Link href="/contributions" className="text-sm text-blue-700">All →</Link>}>
          {recentContributions.length === 0 ? (
            <p className="text-slate-500">Nothing waiting. 🎉</p>
          ) : (
            <ul className="-my-2 divide-y divide-slate-100">
              {recentContributions.map((c) => {
                const st = CONTRIBUTION_STATUS[c.status];
                return (
                  <li key={c.id}>
                    <Link href={`/contributions/${c.id}`} className="flex items-center gap-3 py-2.5 hover:text-blue-700">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.title}</p>
                        <p className="text-xs text-slate-500">{CONTRIBUTION_TYPE_LABEL[c.type]} · {c.user.name ?? "User"} · {relativeTime(c.submittedAt)}</p>
                      </div>
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Content health">
          <ul className="-my-1 space-y-1">
            {healthItems.map((h) => (
              <li key={h.label}>
                <Link href={h.href} className="flex items-center justify-between gap-3 rounded px-1 py-1.5 hover:bg-slate-50">
                  <span className="text-slate-600">{h.label}</span>
                  <span className={h.value ? "font-semibold text-amber-700 tabular-nums" : "text-slate-400 tabular-nums"}>{h.value}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Content">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs text-slate-500">
                <tr><th className="py-1.5 font-medium">Type</th><th className="py-1.5 text-right font-medium">Published</th><th className="py-1.5 text-right font-medium">In review</th><th className="py-1.5 text-right font-medium">Drafts</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contentCounts.map((c) => (
                  <tr key={c.key}>
                    <td className="py-2 font-medium">{ENTITIES[c.key].plural}</td>
                    <td className="py-2 text-right tabular-nums">{c.published}</td>
                    <td className="py-2 text-right tabular-nums">{c.review}</td>
                    <td className="py-2 text-right tabular-nums">{c.drafts}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <Link href={`/${c.key}`} className="text-blue-700">Manage</Link>
                      <span className="mx-2 text-slate-300">·</span>
                      <Link href={`/${c.key}/new`} className="text-blue-700">New</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent activity" actions={<Link href="/activity" className="text-sm text-blue-700">All →</Link>}>
          {activity.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
          <ul className="-my-1 space-y-2.5">
            {activity.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="text-slate-800">{a.summary}</p>
                <p className="text-xs text-slate-500">{a.actor?.name ?? "System"} · {relativeTime(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
