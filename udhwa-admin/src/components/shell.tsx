import type { AdminCounts } from "@/lib/api-client";
import { adminApi, WEB_URL } from "@/lib/api";
import { AdminNav, MobileAdminNav, SignOutLink } from "./nav";

export async function AdminShell({ user, children }: { user: { name: string | null; email: string | null }; children: React.ReactNode }) {
  const counts = await (await adminApi()).get<AdminCounts>("/v1/admin/counts");
  return (
    <div className="min-h-screen bg-slate-50 text-[14px] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">U</span>
          <span className="font-semibold">Udhwa Admin</span>
        </div>
        <AdminNav counts={counts} />
        <div className="border-t border-slate-200 p-3 text-xs text-slate-500">
          <p className="truncate font-medium text-slate-700">{user.name}</p>
          <p className="truncate">{user.email}</p>
          <div className="mt-2 flex gap-3">
            <a href={WEB_URL} className="text-blue-700 hover:underline">← View site</a>
            <SignOutLink />
          </div>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <MobileAdminNav counts={counts} />
          <span className="font-semibold">Udhwa Admin</span>
          <a href={WEB_URL} className="ml-auto text-sm text-blue-700">View site</a>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
