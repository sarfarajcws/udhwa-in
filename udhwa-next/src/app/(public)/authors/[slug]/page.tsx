import { notFound } from "next/navigation";
import { BlogCard, NewsRow } from "@/components/public/cards";
import { Breadcrumbs, EmptyState, JsonLd } from "@/components/ui/misc";
import { breadcrumbLd } from "@/lib/jsonld";
import { getAuthor } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

/**
 * Rendered on first visit, then cached (ISR) until the API reports a content
 * change via /api/revalidate — so builds never depend on the API being up.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/authors/[slug]">) {
  const { slug } = await params;
  const data = await getAuthor(slug);
  if (!data) return {};
  return buildMetadata({
    title: data.author.name,
    description: data.author.bio ?? `Articles by ${data.author.name} on Udhwa.`,
    path: `/authors/${slug}`,
    type: "profile",
    noIndex: data.news.length + data.blogs.length === 0,
  });
}

export default async function AuthorPage({ params }: PageProps<"/authors/[slug]">) {
  const { slug } = await params;
  const data = await getAuthor(slug);
  if (!data) notFound();
  const { author, news, blogs } = data;
  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: absoluteUrl(`/authors/${author.slug}`),
            mainEntity: {
              "@type": author.slug === "udhwa-desk" ? "Organization" : "Person",
              name: author.name,
              description: author.bio ?? undefined,
              image: author.avatarUrl ? absoluteUrl(author.avatarUrl) : undefined,
              url: absoluteUrl(`/authors/${author.slug}`),
            },
          },
          breadcrumbLd([{ name: "Home", path: "/" }, { name: author.name, path: `/authors/${author.slug}` }]),
        ]}
      />
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: author.name }]} />
      <header className="mt-6 flex items-center gap-5">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar
          <img src={author.avatarUrl} alt="" className="size-20 rounded-full object-cover" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-700">{author.name.charAt(0)}</span>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">{author.name}</h1>
          {author.bio && <p className="mt-2 max-w-2xl text-muted">{author.bio}</p>}
        </div>
      </header>
      {blogs.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-ink">Blogs</h2>
          <div className="mt-5 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{blogs.map((b) => <BlogCard key={b.id} post={b} />)}</div>
        </section>
      )}
      {news.length === 0 && blogs.length === 0 && (
        <div className="mt-12">
          <EmptyState title="Nothing published yet">New articles by {author.name} will appear here.</EmptyState>
        </div>
      )}
      {news.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold text-ink">News</h2>
          <div className="mt-4 divide-y divide-line">{news.map((n) => <NewsRow key={n.id} article={n} />)}</div>
        </section>
      )}
    </div>
  );
}
