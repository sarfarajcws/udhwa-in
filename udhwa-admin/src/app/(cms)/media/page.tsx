import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { AdminHeader, Notice, Pill, adminBtn, adminInput } from "@/components/ui";
import { SmartImage } from "@/components/ui/smart-image";
import { Pagination } from "@/components/ui/misc";
import type { AdminMediaList } from "@/lib/api-client";
import { adminApi, getProviders, requireAdmin } from "@/lib/api";
import { listHref } from "@/lib/utils";
import { formatDate, pageParam, stringParam } from "@/lib/utils";
import { deleteMedia, updateMedia } from "@/server/manage";
import { MediaUploader } from "./uploader";

export const metadata = { title: "Media library" };

export default async function MediaPage({ searchParams }: PageProps<"/media">) {
  await requireAdmin();
  const sp = await searchParams;
  const missingAlt = stringParam(sp.missing) === "alt";
  const unused = stringParam(sp.unused) === "1";
  const q = stringParam(sp.q);
  const page = pageParam(sp.page);
  const filters = { q, missing: missingAlt ? "alt" : undefined, unused: unused ? "1" : undefined };
  const [{ total, items }, providers] = await Promise.all([
    (await adminApi()).get<AdminMediaList>("/v1/admin/media", { query: { ...filters, page } }),
    getProviders(),
  ]);
  const cloudinaryEnabled = providers.uploads;
  return (
    <>
      <AdminHeader title="Media library" description={`${total} images · stored on ${cloudinaryEnabled ? "Cloudinary" : "Cloudinary (not configured — showing bundled images only)"}`} />
      {!cloudinaryEnabled && <Notice tone="amber">Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to enable uploads.</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <MediaUploader enabled={cloudinaryEnabled} />
        <form className="flex w-full gap-2 sm:ml-auto sm:w-auto">
          {missingAlt && <input type="hidden" name="missing" value="alt" />}
          {unused && <input type="hidden" name="unused" value="1" />}
          <input name="q" defaultValue={q} placeholder="Search alt text or caption" className={adminInput + " w-full sm:w-64"} aria-label="Search media" />
        </form>
        <a href={listHref("/media", { ...filters, missing: missingAlt ? undefined : "alt" })} className={adminBtn.ghost}>{missingAlt ? "All alt text" : "Missing alt text"}</a>
        <a href={listHref("/media", { ...filters, unused: unused ? undefined : "1" })} className={adminBtn.ghost}>{unused ? "Used and unused" : "Unused only"}</a>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        An image can only be deleted when nothing uses it — no cover, photo, rich-text article or pending contribution. Deleting removes it from Cloudinary too.
      </p>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          {q || missingAlt || unused ? "No images match these filters." : "No images yet. Upload one to get started."}
        </p>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m) => {
          const covers = m._count.placeCovers + m._count.businessCovers + m._count.serviceCovers + m._count.newsCovers + m._count.blogCovers;
          const inText = m._count.usages;
          const uses = covers + inText + (m.photo ? 1 : 0);
          return (
            <li key={m.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative aspect-[16/10] bg-slate-100">
                <SmartImage src={m.url} alt={m.alt} fill sizes="400px" className="object-cover" />
              </div>
              <div className="p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <Pill tone={m.provider === "CLOUDINARY" ? "blue" : "slate"}>{m.provider === "CLOUDINARY" ? "Cloudinary" : "Bundled"}</Pill>
                  {uses ? <Pill tone="green">Used ×{uses}</Pill> : <Pill>Unused</Pill>}
                  {covers > 0 && <span>cover ×{covers}</span>}
                  {m.photo && <a href={`/photo/${m.photo.id}`} className="text-blue-700 hover:underline">photo</a>}
                  {inText > 0 && <span>in text/pending ×{inText}</span>}
                  {m.width && <span>{m.width}×{m.height}</span>}
                  <span>· {formatDate(m.createdAt)}{m.uploadedBy?.name ? ` · ${m.uploadedBy.name}` : ""}</span>
                </div>
                <ActionForm action={updateMedia.bind(null, m.id)} submitLabel="Save">
                  <label className="block text-xs font-medium text-slate-600">Alt text
                    <input name="alt" defaultValue={m.alt} maxLength={300} className={adminInput + " mt-0.5"} />
                  </label>
                  <label className="mt-2 block text-xs font-medium text-slate-600">Caption
                    <input name="caption" defaultValue={m.caption ?? ""} maxLength={500} className={adminInput + " mt-0.5"} />
                  </label>
                  <label className="mt-2 block text-xs font-medium text-slate-600">Credit
                    <input name="credit" defaultValue={m.credit ?? ""} maxLength={120} className={adminInput + " mt-0.5"} />
                  </label>
                </ActionForm>
                {!uses && (
                  <div className="mt-2 text-right">
                    <ActionButton action={deleteMedia.bind(null, m.id)} confirmText="Delete this image permanently (also from Cloudinary)?" className={adminBtn.ghost + " text-red-700"}>Delete</ActionButton>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pages={Math.max(1, Math.ceil(total / 24))} makeHref={(p) => listHref("/media", { ...filters, page: p })} />
    </>
  );
}
