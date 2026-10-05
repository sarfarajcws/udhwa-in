/** Shown while a CMS screen loads its data from the API. */
export default function CmsLoading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 rounded bg-slate-200" />
      <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-slate-100" />)}
      </div>
      <div className="h-64 rounded-lg bg-slate-100" />
    </div>
  );
}
