import Link from "next/link";

export default function CmsNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Not found</h1>
      <p className="mt-2 text-sm text-slate-600">This item doesn’t exist or was deleted.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-blue-700 hover:underline">Back to the dashboard</Link>
    </div>
  );
}
