import { NewsRow } from "@/components/public/cards";
import { TrustNote } from "@/components/public/blocks";
import { ArticleShell, Byline, ConnectedTo, Tags } from "@/components/public/article";
import { CoverFigure, PhotoStrip, SourceBox } from "@/components/public/detail";
import { Breadcrumbs, JsonLd } from "@/components/ui/misc";
import { articleLd, breadcrumbLd } from "@/lib/jsonld";
import { getNews } from "@/lib/queries";
import { redirectOrNotFound } from "@/lib/redirects";
import { RichContent } from "@/components/ui/rich-content";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

/**
 * Rendered on first visit, then cached (ISR) until the API reports a content
 * change via /api/revalidate — so builds never depend on the API being up.
 */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const data = await getNews(slug);
  if (!data) return {};
  const { article: a } = data;
  return buildMetadata({
    title: a.title,
    description: a.excerpt,
    path: `/news/${a.slug}`,
    image: a.cover,
    type: "article",
    publishedTime: a.publishedAt,
    modifiedTime: a.updatedAt,
    authors: a.author ? [a.author.name] : undefined,
    locale: a.language === "hi" ? "hi_IN" : undefined,
    seo: a,
  });
}

export default async function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  const { slug } = await params;
  const data = await getNews(slug);
  if (!data) return redirectOrNotFound(`/news/${slug}`);
  const { article: a, more, photos } = data;
  const path = `/news/${a.slug}`;
  const connected = [
    ...(a.place?.status === "PUBLISHED" ? [{ label: a.place.name, href: `/places/${a.place.slug}`, kind: "Place" }] : []),
    ...(a.business?.status === "PUBLISHED" ? [{ label: a.business.name, href: `/businesses/${a.business.slug}`, kind: "Business" }] : []),
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          articleLd({ kind: "NewsArticle", title: a.title, description: a.excerpt, path, image: a.cover, publishedAt: a.publishedAt, updatedAt: a.updatedAt, author: a.author, language: a.language, section: a.category?.name, keywords: a.tags.map((t) => t.name) }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "News", path: "/news" },
            ...(a.category ? [{ name: a.category.name, path: `/news?category=${a.category.slug}` }] : []),
            { name: a.title, path },
          ]),
        ]}
      />
      <ArticleShell>
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "News", href: "/news" },
            ...(a.category ? [{ name: a.category.name, href: `/news?category=${a.category.slug}` }] : []),
            { name: a.title },
          ]}
        />
        <article lang={a.language} className="mt-6">
          <header>
            {a.category && <p className="eyebrow text-brand-700">{a.category.name}</p>}
            <h1 className="mt-2 text-[1.9rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.5rem]">{a.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted">{a.excerpt}</p>
            <div className="mt-6 border-y border-line py-4">
              <Byline author={a.author} publishedAt={a.publishedAt} updatedAt={a.updatedAt} />
            </div>
          </header>
          {a.cover && (
            <div className="mt-8">
              <CoverFigure media={a.cover} />
            </div>
          )}
          <div className="mt-8">
            <RichContent doc={a.content} />
          </div>
          <SourceBox name={a.sourceName} url={a.sourceUrl} />
          <ConnectedTo items={connected} />
          <Tags tags={a.tags} />
        </article>
        <PhotoStrip photos={photos} />
        <div className="mt-10">
          <TrustNote target="news" id={a.id} name={a.title} updatedAt={a.updatedAt} />
        </div>
        {more.length > 0 && (
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="text-xl font-bold tracking-tight text-ink">More news</h2>
            <div className="mt-4 divide-y divide-line">
              {more.map((n) => (
                <NewsRow key={n.id} article={n} />
              ))}
            </div>
          </section>
        )}
      </ArticleShell>
    </div>
  );
}
