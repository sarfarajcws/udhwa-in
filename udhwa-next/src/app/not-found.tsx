import Link from "next/link";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { SearchForm } from "@/components/public/search-form";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page flex-1 py-20 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">We couldn’t find that page</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">It may have moved, or it was never published. Try searching instead.</p>
        <SearchForm className="mx-auto mt-8 max-w-lg" />
        <p className="mt-6 text-sm">
          <Link href="/" className="link">Back to home</Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
