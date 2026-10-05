import { PlaceCard } from "@/components/public/cards";
import { Listing } from "@/components/public/listing";
import { listingMetadata } from "@/lib/listing-meta";
import { getCategories, listPlaces } from "@/lib/queries";
import { pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const BASE = "/places";
const TITLE = "Places";
const DESCRIPTION = "Lakes, schools, stations, landmarks and the other places that make up the community — with history, photos and everything connected to them.";

export async function generateMetadata({ searchParams }: PageProps<"/places">) {
  const sp = await searchParams;
  const categories = await getCategories("PLACE");
  return listingMetadata({ base: BASE, title: TITLE, description: DESCRIPTION, category: categories.find((c) => c.slug === stringParam(sp.category)), q: stringParam(sp.q), page: pageParam(sp.page) });
}

export default async function Page({ searchParams }: PageProps<"/places">) {
  const sp = await searchParams;
  const category = stringParam(sp.category);
  const q = stringParam(sp.q);
  const [categories, result] = await Promise.all([getCategories("PLACE"), listPlaces({ category, q, page: pageParam(sp.page) })]);
  return (
    <Listing base={BASE} title={TITLE} description={DESCRIPTION} categories={categories} category={category} q={q} page={result.page} pages={result.pages} total={result.total} noun="place" emptyCta={{ href: "/contribute/place", label: "Suggest a place" }}>
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{result.items.map((p) => <PlaceCard key={p.id} place={p} />)}</div>
    </Listing>
  );
}
