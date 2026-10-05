import { AdminShell } from "@/components/shell";
import { requireAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/");
  return <AdminShell user={user}>{children}</AdminShell>;
}
