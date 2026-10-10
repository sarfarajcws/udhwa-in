import { NotFoundContent } from "@/components/public/not-found-content";

export const metadata = { title: "Page not found", robots: { index: false } };

/** 404 for pages inside (public): the layout already renders the header, <main> and footer. */
export default function PublicNotFound() {
  return <NotFoundContent />;
}
