import Link from "next/link";
import { SearchForm } from "./search-form";

/** The body of the 404 page, without any page chrome (header/footer/<main>) around it. */
export function NotFoundContent() {
  return (
    <div className="container-page py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">We couldn’t find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">It may have moved, or it was never published. Try searching instead.</p>
      <SearchForm className="mx-auto mt-8 max-w-lg" />
      <p className="mt-6 text-sm">
        <Link href="/" className="link">Back to home</Link>
      </p>
    </div>
  );
}
