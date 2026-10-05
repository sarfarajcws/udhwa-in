import Link from "next/link";
import { Search } from "lucide-react";
import { publicNav } from "@/lib/site";
import { Logo } from "./logo";
import { MobileMenu, NavLink, UserMenu } from "./site-header-client";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {publicNav.map((n) => (
            <NavLink key={n.href} href={n.href}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/search" className="flex size-10 items-center justify-center rounded-lg text-ink-soft hover:bg-sunken hover:text-ink" aria-label="Search Udhwa">
            <Search className="size-5" />
          </Link>
          <Link href="/contribute" className="hidden h-10 items-center rounded-lg px-3 text-sm font-semibold text-ink-soft hover:bg-sunken hover:text-ink sm:flex">
            Contribute
          </Link>
          <UserMenu />
          <MobileMenu items={[...publicNav, { href: "/contribute", label: "Contribute" }, { href: "/about", label: "About" }, { href: "/contact", label: "Contact" }]} />
        </div>
      </div>
    </header>
  );
}
