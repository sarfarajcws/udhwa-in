import { NotFoundContent } from "@/components/public/not-found-content";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export const metadata = { title: "Page not found", robots: { index: false } };

/**
 * Root 404: used for URLs that match no route at all, which render outside the
 * (public) layout and so need their own header and footer. A 404 raised by a page
 * inside (public) uses (public)/not-found.tsx instead — the layout already
 * provides the chrome there, and rendering it here too showed it twice.
 */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </>
  );
}
