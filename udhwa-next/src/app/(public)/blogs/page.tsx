import { BlogCard } from "@/components/public/cards";
import { Listing } from "@/components/public/listing";
import { listingMetadata } from "@/lib/listing-meta";
import { getCategories, listBlogs } from "@/lib/queries";
import { pageParam, stringParam } from "@/lib/utils";

export const revalidate = 300;

const BASE = "/blogs";
const TITLE = "Blogs";
const DESCRIPTION = "Guides, local stories, history, culture and useful long reads — what is worth reading.";

export async function generateMetadata({ searchParams }: PageProps<"/blogs">) {
  const sp = await searchParams;
  const categories = await getCategories("BLOG");
  return listingMetadata({ base: BASE, title: TITLE, description: DESCRIPTION, category: categories.find((c) => c.slug === stringParam(sp.category)), q: stringParam(sp.q), tag: stringParam(sp.tag), page: pageParam(sp.page) });
}

export default async function Page({ searchParams }: PageProps<"/blogs">) {
  const sp = await searchParams;
  const category = stringParam(sp.category);
  const q = stringParam(sp.q);
  const tagSlug = stringParam(sp.tag);
  const [categories, result] = await Promise.all([getCategories("BLOG"), listBlogs({ category, q, tag: tagSlug, page: pageParam(sp.page) })]);
  return (
    <Listing base={BASE} title={TITLE} description={DESCRIPTION} categories={categories} category={category} q={q} tag={tagSlug ? { slug: tagSlug, name: tagSlug } : undefined} page={result.page} pages={result.pages} total={result.total} noun="article" emptyCta={{ href: "/contribute/blog", label: "Write a blog" }}>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((b) => <BlogCard key={b.id} post={b} />)}</div>
    </Listing>
  );
}
