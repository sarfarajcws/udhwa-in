import { notFound } from "next/navigation";
import { ContributionForm } from "@/components/public/contribution-form";
import { Breadcrumbs } from "@/components/ui/misc";
import type { ContributionOptions } from "@/lib/api-client";
import { freshApi, getProviders, requireUser } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";
import { typeFromSlug } from "@/lib/contribution-types";
import { submitContribution } from "@/server/actions";

export async function generateMetadata({ params }: PageProps<"/contribute/[type]">) {
  const t = typeFromSlug((await params).type);
  return t ? buildMetadata({ title: t.title, description: t.description, path: `/contribute/${t.slug}`, noIndex: true }) : {};
}

export default async function ContributeTypePage({ params }: PageProps<"/contribute/[type]">) {
  const { type: slug } = await params;
  const t = typeFromSlug(slug);
  if (!t) notFound();
  await requireUser(`/contribute/${slug}`);

  const [{ categories, places }, providers] = await Promise.all([freshApi.get<ContributionOptions>(`/v1/contributions/options/${t.slug}`), getProviders()]);

  return (
    <div className="container-page max-w-2xl py-8 sm:py-12">
      <Breadcrumbs items={[{ name: "Contribute", href: "/contribute" }, { name: t.title }]} />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink">{t.title}</h1>
      <p className="mt-2 text-muted">{t.description}</p>
      <div className="mt-8">
        <ContributionForm type={t.type} action={submitContribution.bind(null, t.type)} categories={categories} places={places} uploadsEnabled={providers.uploads} />
      </div>
    </div>
  );
}
