import Link from "next/link";
import { notFound } from "next/navigation";
import { CorrectionForm } from "./correction-form";
import { Breadcrumbs } from "@/components/ui/misc";
import { orNull, type CorrectionTarget } from "@/lib/api-client";
import { freshApi, requireUser } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";
import { CORRECTION_TARGETS, type CorrectionTargetKey } from "@/lib/contribution-types";
import { stringParam } from "@/lib/utils";

export const metadata = buildMetadata({ title: "Suggest a correction", description: "Report incorrect or outdated information on Udhwa.", path: "/contribute/correction", noIndex: true });

function loadTarget(target: CorrectionTargetKey, id: string) {
  return orNull(freshApi.get<CorrectionTarget>("/v1/corrections/target", { query: { target, id } }));
}

export default async function CorrectionPage({ searchParams }: PageProps<"/contribute/correction">) {
  const sp = await searchParams;
  const target = stringParam(sp.target) as CorrectionTargetKey | undefined;
  const id = stringParam(sp.id);
  const kind = stringParam(sp.kind) === "OWNERSHIP_CLAIM" ? "OWNERSHIP_CLAIM" : "CORRECTION";
  if (!target || !CORRECTION_TARGETS.includes(target) || !id) {
    return (
      <div className="container-page max-w-2xl py-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Suggest a correction</h1>
        <p className="mt-3 text-muted">
          Open the page with the wrong information and choose <strong>Suggest a correction</strong> at the bottom — that way the team knows exactly
          what you mean. <Link href="/search" className="link">Search Udhwa</Link>
        </p>
      </div>
    );
  }
  const qs = `?target=${target}&id=${encodeURIComponent(id)}${kind === "OWNERSHIP_CLAIM" ? "&kind=OWNERSHIP_CLAIM" : ""}`;
  await requireUser(`/contribute/correction${qs}`);
  const item = await loadTarget(target, id);
  if (!item) notFound();

  return (
    <div className="container-page max-w-2xl py-8 sm:py-12">
      <Breadcrumbs items={[{ name: item.name, href: item.href }, { name: kind === "OWNERSHIP_CLAIM" ? "Claim" : "Correction" }]} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{kind === "OWNERSHIP_CLAIM" ? "I run this business" : "Suggest a correction"}</h1>
      <p className="mt-2 text-muted">
        About: <Link href={item.href} className="link font-medium">{item.name}</Link>
      </p>
      <div className="mt-8">
        <CorrectionForm target={target} id={id} defaultKind={kind} backHref={item.href} />
      </div>
    </div>
  );
}
