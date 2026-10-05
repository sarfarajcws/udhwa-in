import { BusinessCard } from "@/components/public/cards";
import { Listing } from "@/components/public/listing";
import { listingMetadata } from "@/lib/listing-meta";
import { getCategories, listBusinesses } from "@/lib/queries";
import { pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const BASE = "/businesses";
const TITLE = "Businesses";
const DESCRIPTION = "Shops, restaurants, clinics and other organisations operating here — useful information first, verified by the Udhwa team.";

export async function generateMetadata({ searchParams }: PageProps<"/businesses">) {
  const sp = await searchParams;
  const categories = await getCategories("BUSINESS");
  return listingMetadata({ base: BASE, title: TITLE, description: DESCRIPTION, category: categories.find((c) => c.slug === stringParam(sp.category)), q: stringParam(sp.q), page: pageParam(sp.page) });
}

export default async function Page({ searchParams }: PageProps<"/businesses">) {
  const sp = await searchParams;
  const category = stringParam(sp.category);
  const q = stringParam(sp.q);
  const [categories, result] = await Promise.all([getCategories("BUSINESS"), listBusinesses({ category, q, page: pageParam(sp.page) })]);
  return (
    <Listing base={BASE} title={TITLE} description={DESCRIPTION} categories={categories} category={category} q={q} page={result.page} pages={result.pages} total={result.total} noun="business" emptyCta={{ href: "/contribute/business", label: "Suggest a business" }}>
      <div className="grid gap-3 md:grid-cols-2">{result.items.map((b) => <BusinessCard key={b.id} business={b} />)}</div>
    </Listing>
  );
}
