import { ServiceCard } from "@/components/public/cards";
import { Listing } from "@/components/public/listing";
import { listingMetadata } from "@/lib/listing-meta";
import { getCategories, listServices } from "@/lib/queries";
import { pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const BASE = "/services";
const TITLE = "Services";
const DESCRIPTION = "Electricians, tutors, taxis, repairs and more — what you can get done locally, and who to call.";

export async function generateMetadata({ searchParams }: PageProps<"/services">) {
  const sp = await searchParams;
  const categories = await getCategories("SERVICE");
  return listingMetadata({ base: BASE, title: TITLE, description: DESCRIPTION, category: categories.find((c) => c.slug === stringParam(sp.category)), q: stringParam(sp.q), page: pageParam(sp.page) });
}

export default async function Page({ searchParams }: PageProps<"/services">) {
  const sp = await searchParams;
  const category = stringParam(sp.category);
  const q = stringParam(sp.q);
  const [categories, result] = await Promise.all([getCategories("SERVICE"), listServices({ category, q, page: pageParam(sp.page) })]);
  return (
    <Listing base={BASE} title={TITLE} description={DESCRIPTION} categories={categories} category={category} q={q} page={result.page} pages={result.pages} total={result.total} noun="service" emptyCta={{ href: "/contribute/service", label: "Suggest a service" }}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((s) => <ServiceCard key={s.id} service={s} />)}</div>
    </Listing>
  );
}
