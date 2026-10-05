import Link from "next/link";
import { BlogCard } from "@/components/public/cards";
import { TrustNote } from "@/components/public/blocks";
import { ArticleShell, Byline, ConnectedTo, Tags } from "@/components/public/article";
import { CoverFigure } from "@/components/public/detail";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { articleLd, breadcrumbLd } from "@/lib/jsonld";
import { getBlog } from "@/lib/queries";
import { redirectOrNotFound } from "@/lib/redirects";
import { RichContent } from "@/components/ui/rich-content";
import { docHeadings } from "@/lib/rich-text/schema";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

/**
 * Rendered on first visit, then cached (ISR) until the API reports a content
 * change via /api/revalidate — so builds never depend on the API being up.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/blogs/[slug]">) {
  const { slug } = await params;
  const data = await getBlog(slug);
  if (!data) return {};
  const { post: p } = data;
  return buildMetadata({
    title: p.title,
    description: p.excerpt,
    path: `/blogs/${p.slug}`,
    image: p.cover,
    type: "article",
    publishedTime: p.publishedAt,
    modifiedTime: p.updatedAt,
    authors: p.author ? [p.author.name] : undefined,
    seo: p,
  });
}

export default async function BlogPostPage({ params }: PageProps<"/blogs/[slug]">) {
  const { slug } = await params;
  const data = await getBlog(slug);
  if (!data) return redirectOrNotFound(`/blogs/${slug}`);
  const { post: p, related } = data;
  const path = `/blogs/${p.slug}`;
  const headings = docHeadings(p.content).filter((h) => h.level === 2);
  const connected = [
    ...(p.place?.status === "PUBLISHED" ? [{ label: p.place.name, href: `/places/${p.place.slug}`, kind: "Place" }] : []),
    ...(p.business?.status === "PUBLISHED" ? [{ label: p.business.name, href: `/businesses/${p.business.slug}`, kind: "Business" }] : []),
    ...(p.service?.status === "PUBLISHED" ? [{ label: p.service.name, href: `/services/${p.service.slug}`, kind: "Service" }] : []),
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          articleLd({ kind: "BlogPosting", title: p.title, description: p.excerpt, path, image: p.cover, publishedAt: p.publishedAt, updatedAt: p.updatedAt, author: p.author, language: p.language, section: p.category?.name, keywords: p.tags.map((t) => t.name) }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Blogs", path: "/blogs" },
            ...(p.category ? [{ name: p.category.name, path: `/blogs?category=${p.category.slug}` }] : []),
            { name: p.title, path },
          ]),
        ]}
      />
      <ArticleShell>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Blogs", href: "/blogs" },
            ...(p.category ? [{ name: p.category.name, href: `/blogs?category=${p.category.slug}` }] : []),
            { name: p.title },
          ]}
        />
        <article lang={p.language} className="mt-6">
          <header>
            {p.category && <p className="eyebrow text-brand-700">{p.category.name}</p>}
            <h1 className="mt-2 text-[1.9rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">{p.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{p.excerpt}</p>
            <div className="mt-6">
              <Byline author={p.author} publishedAt={p.publishedAt} updatedAt={p.updatedAt} readingMinutes={p.readingMinutes} />
            </div>
          </header>
          {p.cover && (
            <div className="mt-8">
              <CoverFigure media={p.cover} />
            </div>
          )}
          {headings.length >= 4 && (
            <nav aria-label="On this page" className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-5">
              <p className="eyebrow">On this page</p>
              <ol className="mt-3 grid gap-1.5 text-[15px] sm:grid-cols-2">
                {headings.map((h) => (
                  <li key={h.id}>
                    <a href={`#${h.id}`} className="text-ink-soft hover:text-brand-700">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className="mt-8">
            <RichContent doc={p.content} />
          </div>
          <ConnectedTo items={connected} />
          <Tags tags={p.tags} base="/blogs" />
        </article>

        {p.author && (
          <div className="mt-12 flex gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <div>
              <p className="eyebrow">Written by</p>
              <p className="mt-1 font-semibold text-ink">
                <Link href={`/authors/${p.author.slug}`} className="hover:text-brand-700">
                  {p.author.name}
                </Link>
              </p>
              {p.author.bio && <p className="mt-1 text-sm text-muted">{p.author.bio}</p>}
            </div>
          </div>
        )}
        <div className="mt-6">
          <TrustNote target="blog" id={p.id} name={p.title} updatedAt={p.updatedAt} />
        </div>
      </ArticleShell>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl border-t border-line pt-10">
          <h2 className="text-xl font-bold tracking-tight text-ink">Keep reading</h2>
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogCard key={r.id} post={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
