import { NewsRow } from "@/components/public/cards";
import { Listing } from "@/components/public/listing";
import { listingMetadata } from "@/lib/listing-meta";
import { getCategories, listNews } from "@/lib/queries";
import { pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const BASE = "/news";
const TITLE = "News";
const DESCRIPTION = "What is happening — local updates, announcements and verified reports, with sources.";

export async function generateMetadata({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const categories = await getCategories("NEWS");
  return listingMetadata({ base: BASE, title: TITLE, description: DESCRIPTION, category: categories.find((c) => c.slug === stringParam(sp.category)), q: stringParam(sp.q), page: pageParam(sp.page) });
}

export default async function Page({ searchParams }: PageProps<"/news">) {
  const sp = await searchParams;
  const category = stringParam(sp.category);
  const q = stringParam(sp.q);
  const [categories, result] = await Promise.all([getCategories("NEWS"), listNews({ category, q, page: pageParam(sp.page) })]);
  return (
    <Listing base={BASE} title={TITLE} description={DESCRIPTION} categories={categories} category={category} q={q} page={result.page} pages={result.pages} total={result.total} noun="update" emptyCta={{ href: "/contribute/news", label: "Send a community update" }}>
      <div className="max-w-3xl divide-y divide-line">{result.items.map((n) => <NewsRow key={n.id} article={n} />)}</div>
    </Listing>
  );
}
