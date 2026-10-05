"use client";

import { useEffect } from "react";
import { adminBtn } from "@/components/ui";

/** Errors inside the CMS keep the admin shell (sidebar, header) around them. */
export default function CmsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Something went wrong</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">This screen didn’t load</h1>
      <p className="mt-2 text-sm text-slate-600">The API may be unreachable or returned an error. Your data is safe — try again in a moment.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>}
      <button type="button" onClick={reset} className={adminBtn.primary + " mt-6"}>Try again</button>
    </div>
  );
}
