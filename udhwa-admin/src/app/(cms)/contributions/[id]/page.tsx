import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Panel, Pill } from "@/components/ui";
import { PayloadView } from "@/components/ui/payload-view";
import { orNull, type AdminContribution } from "@/lib/api-client";
import { adminApi, requireAdmin } from "@/lib/api";
import { CONTRIBUTION_STATUS, CONTRIBUTION_TYPE_LABEL } from "@/lib/status";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ModerationPanel } from "./moderation-panel";

export const metadata = { title: "Review contribution" };

export default async function ContributionReview({ params }: PageProps<"/contributions/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const data = await orNull((await adminApi()).get<AdminContribution>(`/v1/admin/contributions/${encodeURIComponent(id)}`));
  if (!data) notFound();
  const { contribution: c, media, published, history, linked } = data;
  const st = CONTRIBUTION_STATUS[c.status];
  const open = ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(c.status);

  return (
    <>
      <AdminHeader
        title={c.title}
        back={{ href: "/contributions", label: "Contributions" }}
        description={<span className="flex flex-wrap items-center gap-2"><Pill tone={st.tone}>{st.label}</Pill> {CONTRIBUTION_TYPE_LABEL[c.type]} · submitted {formatDateTime(c.submittedAt)}</span>}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <PayloadView type={c.type} payload={c.payload} media={media} />
        </div>
        <aside className="space-y-6">
          {open ? (
            <ModerationPanel id={c.id} status={c.status} />
          ) : (
            <Panel title="Outcome">
              <p className="text-sm text-slate-600">{st.help}</p>
              {linked && <Link href={linked} className="mt-3 inline-block text-sm font-semibold text-blue-700">Open the draft/entity →</Link>}
            </Panel>
          )}
          {c.reviewNote && (
            <Panel title="Note to contributor">
              <p className="text-sm whitespace-pre-line text-slate-700">{c.reviewNote}</p>
              {c.reviewer && <p className="mt-2 text-xs text-slate-500">— {c.reviewer.name}{c.reviewedAt ? `, ${formatDate(c.reviewedAt)}` : ""}</p>}
            </Panel>
          )}
          <Panel title="Contributor">
            <p className="font-medium">{c.user.name ?? "—"}</p>
            <p className="text-sm text-slate-500">{c.user.email}</p>
            <p className="mt-2 text-sm text-slate-600">Joined {formatDate(c.user.createdAt)} · {c.user._count.contributions} contributions · {published} published</p>
            {c.user.status === "SUSPENDED" && <Pill tone="red">Suspended</Pill>}
          </Panel>
          {history.length > 0 && (
            <Panel title="History">
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id}>{h.summary}<span className="block text-xs text-slate-500">{h.actor?.name ?? "System"} · {formatDateTime(h.createdAt)}</span></li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
