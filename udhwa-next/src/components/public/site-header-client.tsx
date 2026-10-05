"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/components/ui/auth";
import { LayoutDashboard, LogOut, Menu, User, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useOnPathChange } from "@/components/ui/use-path-change";

export function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-[15px] font-medium transition-colors",
        active ? "text-brand-700" : "text-ink-soft hover:bg-sunken hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function MobileMenu({ items }: { items: readonly { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  useOnPathChange(() => setOpen(false));
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-lg text-ink hover:bg-sunken"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? <X className="size-6" /> : <Menu className="size-6" />}
      </button>
      {/*
        Rendered into <body>: the sticky header uses backdrop-filter, which makes
        it the containing block for position:fixed children — rendered inside it,
        the panel was clipped to ~1px and the menu looked broken on phones.
      */}
      {open &&
        createPortal(
          <div id="mobile-nav" className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto border-t border-line bg-canvas lg:hidden">
            <nav aria-label="Mobile" className="container-page py-4">
              <ul className="divide-y divide-line">
                {items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href} onClick={() => setOpen(false)} className="flex items-center justify-between py-4 text-lg font-semibold text-ink">
                      {it.label}
                      <span aria-hidden className="text-muted">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function UserMenu() {
  const { user, status } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useOnPathChange(() => setOpen(false));
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (status === "loading") return <div className="size-10" aria-hidden />;
  if (!user) {
    return (
      <Link href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`} className="flex h-10 items-center rounded-lg bg-ink px-3.5 text-sm font-semibold text-white hover:bg-ink-soft">
        Sign in
      </Link>
    );
  }
  const u = user;
  const initial = (u.name ?? u.email ?? "?").trim().charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-50 text-sm font-bold text-brand-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- tiny avatar from Google
          <img src={u.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initial
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg shadow-ink/5">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{u.name ?? "Udhwa member"}</p>
            <p className="truncate text-xs text-muted">{u.email}</p>
          </div>
          <Link role="menuitem" href="/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:bg-sunken">
            <User className="size-4" /> Profile & contributions
          </Link>
          {u.role === "ADMIN" && (
            <a role="menuitem" href={process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft hover:bg-sunken">
              <LayoutDashboard className="size-4" /> Admin
            </a>
          )}
          <button role="menuitem" type="button" onClick={() => signOut("/")} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-sunken">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
