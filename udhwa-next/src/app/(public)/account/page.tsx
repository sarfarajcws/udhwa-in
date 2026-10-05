import Link from "next/link";
import { ProfileForm } from "./profile-form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import type { AccountData } from "@/lib/api-client";
import { requireUser, userApi } from "@/lib/api";
import { CONTRIBUTION_STATUS, CONTRIBUTION_TYPE_LABEL, CORRECTION_KIND_LABEL, CORRECTION_STATUS } from "@/lib/status";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Your profile", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const { contributions, corrections } = await (await userApi()).get<AccountData>("/v1/me/account");
  const published = contributions.filter((c) => c.status === "PUBLISHED").length;

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google avatar
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-20 rounded-full object-cover" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-brand-50 text-3xl font-bold text-brand-700">{(user.name ?? "?").charAt(0)}</span>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{user.name ?? "Your profile"}</h1>
          <p className="mt-1 text-sm text-muted">
            {user.username ? <>@{user.username} · </> : null}Joined {formatDate(user.createdAt)} · {published} published contribution{published === 1 ? "" : "s"}
          </p>
        </div>
        <ButtonLink href="/contribute">New contribution</ButtonLink>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-bold tracking-tight text-ink">Your contributions</h2>
            {contributions.length === 0 ? (
              <div className="mt-4">
                <EmptyState title="Nothing yet" action={<ButtonLink href="/contribute" variant="secondary">Make your first contribution</ButtonLink>}>
                  Suggestions, photos and blogs you send will appear here with their review status.
                </EmptyState>
              </div>
            ) : (
              <ul className="card mt-4 divide-y divide-line">
                {contributions.map((c) => {
                  const st = CONTRIBUTION_STATUS[c.status];
                  return (
                    <li key={c.id}>
                      <Link href={`/account/contributions/${c.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-canvas">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{c.title}</p>
                          <p className="text-xs text-muted">{CONTRIBUTION_TYPE_LABEL[c.type]} · {formatDate(c.submittedAt)}</p>
                        </div>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {corrections.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-ink">Corrections you reported</h2>
              <ul className="card mt-4 divide-y divide-line">
                {corrections.map((c) => {
                  const target = c.place?.name ?? c.business?.name ?? c.service?.name ?? c.news?.title ?? c.blog?.title ?? c.photo?.title ?? "—";
                  const st = CORRECTION_STATUS[c.status];
                  return (
                    <li key={c.id} className="px-4 py-3.5">
                      <div className="flex items-center gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink">{target}</p>
                          <p className="text-xs text-muted">{CORRECTION_KIND_LABEL[c.kind]} · {formatDate(c.createdAt)}</p>
                        </div>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{c.message}</p>
                      {c.resolutionNote && <p className="mt-1.5 text-sm text-muted"><span className="font-medium">Team:</span> {c.resolutionNote}</p>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside>
          <div className="card p-5">
            <h2 className="font-semibold text-ink">Profile</h2>
            <p className="mt-1 text-sm text-muted">Shown next to things you contribute. Kept simple on purpose.</p>
            <div className="mt-5">
              <ProfileForm initial={{ name: user.name ?? "", username: user.username ?? "", bio: user.bio ?? "" }} />
            </div>
          </div>
          <p className="mt-4 px-1 text-xs text-muted">Signed in as {user.email}</p>
        </aside>
      </div>
    </div>
  );
}
