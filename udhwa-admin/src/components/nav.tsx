"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Building2, Camera, FileText, FolderTree, Inbox, Image as ImageIcon, LayoutDashboard, Map, MapPin, Menu,
  MessageSquareWarning, Newspaper, PenSquare, SearchCheck, Shuffle, Tags, UserSquare, Users, Wrench, X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "@/components/ui/auth";
import { cn } from "@/lib/utils";
import { useOnPathChange } from "@/components/ui/use-path-change";

type Counts = { contributions: number; corrections: number; messages: number };

const groups = (c: Counts) => [
  { title: null, items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    title: "Review",
    items: [
      { href: "/contributions", label: "Contributions", icon: Inbox, count: c.contributions },
      { href: "/corrections", label: "Corrections", icon: MessageSquareWarning, count: c.corrections },
      { href: "/messages", label: "Messages", icon: FileText, count: c.messages },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/place", label: "Places", icon: MapPin },
      { href: "/business", label: "Businesses", icon: Building2 },
      { href: "/service", label: "Services", icon: Wrench },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/blog", label: "Blogs", icon: PenSquare },
      { href: "/photo", label: "Photos", icon: Camera },
      { href: "/media", label: "Media library", icon: ImageIcon },
      { href: "/seo", label: "SEO health", icon: SearchCheck },
    ],
  },
  {
    title: "Organise",
    items: [
      { href: "/categories", label: "Categories", icon: FolderTree },
      { href: "/tags", label: "Tags", icon: Tags },
      { href: "/authors", label: "Authors", icon: UserSquare },
      { href: "/localities", label: "Localities", icon: Map },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/redirects", label: "Redirects", icon: Shuffle },
      { href: "/activity", label: "Activity log", icon: Activity },
    ],
  },
];

export function AdminNav({ counts }: { counts: Counts }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Admin">
      {groups(counts).map((g, i) => (
        <div key={i} className="mb-4">
          {g.title && <p className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{g.title}</p>}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              const active = "exact" in it && it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 font-medium", active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}
                  >
                    <Icon className="size-4" />
                    <span className="flex-1">{it.label}</span>
                    {"count" in it && it.count ? (
                      <span className={cn("rounded-full px-1.5 text-xs font-semibold", active ? "bg-white/20" : "bg-amber-100 text-amber-800")}>{it.count}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileAdminNav({ counts }: { counts: Counts }) {
  const [open, setOpen] = useState(false);
  useOnPathChange(() => setOpen(false));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex size-9 items-center justify-center rounded-md hover:bg-slate-100" aria-label="Open admin menu">
        <Menu className="size-5" />
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <span className="font-semibold">Udhwa Admin</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="flex size-9 items-center justify-center rounded-md hover:bg-slate-100">
                <X className="size-5" />
              </button>
            </div>
            <AdminNav counts={counts} />
            <div className="border-t border-slate-200 p-3"><SignOutLink /></div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export function SignOutLink() {
  return (
    <button type="button" onClick={() => signOut("/signin")} className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline">
      Sign out
    </button>
  );
}
