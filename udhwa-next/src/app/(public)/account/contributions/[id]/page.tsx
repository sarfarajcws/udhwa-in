import Link from "next/link";
import { notFound } from "next/navigation";
import { ContributionForm } from "@/components/public/contribution-form";
import { PayloadView } from "@/components/ui/payload-view";
import { Alert, Badge, Breadcrumbs } from "@/components/ui/misc";
import { orNull, type MyContribution } from "@/lib/api-client";
import { getProviders, requireUser, userApi } from "@/lib/api";
import { CONTRIBUTION_STATUS, CONTRIBUTION_TYPE_LABEL } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import { resubmitContribution } from "@/server/actions";
import { WithdrawButton } from "./withdraw-button";

export const metadata = { title: "Contribution", robots: { index: false } };

export default async function ContributionDetail({ params, searchParams }: PageProps<"/account/contributions/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireUser(`/account/contributions/${id}`);
  const [data, providers] = await Promise.all([orNull((await userApi()).get<MyContribution>(`/v1/me/contributions/${encodeURIComponent(id)}`)), getProviders()]);
  if (!data) notFound();
  const { contribution: c, editable, media, categories, places, liveHref } = data;
  const st = CONTRIBUTION_STATUS[c.status];
  const payload = c.payload;
  const cloudinaryEnabled = providers.uploads;

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "Your profile", href: "/account" }, { name: c.title }]} />
      {sp.submitted && <Alert tone="success" className="mt-6">Thanks! Your contribution has been sent to the Udhwa team for review.</Alert>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Badge tone={st.tone}>{st.label}</Badge>
        <span className="text-sm text-muted">{CONTRIBUTION_TYPE_LABEL[c.type]} · submitted {formatDateTime(c.submittedAt)}</span>
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">{c.title}</h1>
      <p className="mt-2 text-muted">{st.help}</p>

      {c.reviewNote && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-amber-100 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-ink">Note from the Udhwa team</p>
          <p className="mt-1 whitespace-pre-line text-ink-soft">{c.reviewNote}</p>
        </div>
      )}
      {liveHref && (
        <p className="mt-6">
          <Link href={liveHref} className="link font-semibold">View it on Udhwa →</Link>
        </p>
      )}

      {editable ? (
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-ink">{c.status === "CHANGES_REQUESTED" ? "Update and resubmit" : "Edit your submission"}</h2>
            <WithdrawButton id={c.id} />
          </div>
          <ContributionForm
            type={c.type}
            action={resubmitContribution.bind(null, c.id)}
            initial={payload}
            categories={categories}
            places={places}
            uploadsEnabled={cloudinaryEnabled}
            initialMedia={media[0] ?? null}
            submitLabel={c.status === "CHANGES_REQUESTED" ? "Resubmit for review" : "Save changes"}
          />
        </section>
      ) : (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-ink">What you sent</h2>
          <div className="mt-4">
            <PayloadView type={c.type} payload={payload} media={media} />
          </div>
        </section>
      )}
    </div>
  );
}
