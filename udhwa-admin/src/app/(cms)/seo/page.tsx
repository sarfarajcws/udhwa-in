import Link from "next/link";
import { AdminHeader, Panel, Pill, Stat, Table, Td, emptyNote } from "@/components/ui";
import { ENTITIES } from "@/lib/entities";
import type { AdminSeoReport } from "@/lib/api-client";
import { adminApi, liveUrl, requireAdmin } from "@/lib/api";

export const metadata = { title: "SEO health" };

export default async function SeoPage() {
  await requireAdmin();
  const report = await (await adminApi()).get<AdminSeoReport>("/v1/admin/seo");
  return (
    <>
      <AdminHeader
        title="SEO health"
        description="How published content will look in search results and when shared. Titles and descriptions fall back to the name and summary unless you set SEO fields on the item."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Published items checked" value={report.checked} />
        <Stat label="Items with suggestions" value={report.totalIssues} tone={report.totalIssues ? "amber" : undefined} />
        <Stat label="Photos without alt text" value={report.photosNoAlt} href="/media?missing=alt" tone={report.photosNoAlt ? "amber" : undefined} />
        <Stat label="Photos without a caption" value={report.photosNoCaption} href="/photo" />
      </div>
      <Panel title="Suggestions" className="mt-6">
        <Table head={["Item", "Type", "Suggestions", ""]} empty={emptyNote(report.issues.length === 0, "Everything published looks good. 🎉")}>
          {report.issues.map((i) => (
            <tr key={`${i.entity}-${i.id}`}>
              <Td>
                <Link href={`/${i.entity}/${i.id}`} className="font-medium text-slate-900 hover:underline">{i.title}</Link>
                <p className="text-xs text-slate-500">{i.publicPath}</p>
              </Td>
              <Td><Pill>{ENTITIES[i.entity].label}</Pill></Td>
              <Td>
                <ul className="list-disc space-y-0.5 pl-4 text-sm text-slate-700">
                  {i.problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </Td>
              <Td className="text-right whitespace-nowrap">
                <a href={liveUrl(i.publicPath)} target="_blank" rel="noreferrer" className="text-sm text-blue-700">View ↗</a>
              </Td>
            </tr>
          ))}
        </Table>
        {report.totalIssues > report.issues.length && <p className="mt-3 text-sm text-slate-500">Showing the first {report.issues.length} of {report.totalIssues}.</p>}
      </Panel>
    </>
  );
}
