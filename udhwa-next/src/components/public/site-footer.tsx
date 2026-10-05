import Link from "next/link";
import { site } from "@/lib/site";
import { Logo } from "./logo";

const groups = [
  {
    title: "Explore",
    links: [
      { href: "/places", label: "Places" },
      { href: "/businesses", label: "Businesses" },
      { href: "/services", label: "Services" },
      { href: "/photos", label: "Photos" },
    ],
  },
  {
    title: "Read",
    links: [
      { href: "/news", label: "News" },
      { href: "/blogs", label: "Blogs" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/contribute", label: "Contribute" },
      { href: "/manifesto", label: "Manifesto" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {site.tagline}. Information contributed by the community and maintained by the Udhwa team.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h2 className="eyebrow">{g.title}</h2>
            <ul className="mt-3 space-y-2">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[15px] text-ink-soft hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {site.domain} · Truth over virality.</p>
          <p>
            Spotted something wrong? <Link href="/contribute" className="link">Suggest a correction</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
