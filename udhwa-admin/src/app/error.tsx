"use client";

import { useEffect } from "react";

/** Errors outside the CMS shell (e.g. the API is unreachable while checking the session). */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Udhwa Admin</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Can’t reach the Udhwa API right now</h1>
        <p className="mt-2 text-sm text-slate-600">Check that the API is running and API_URL is set correctly, then try again.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</p>}
        <button type="button" onClick={reset} className="mt-6 inline-flex h-9 items-center rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
          Try again
        </button>
      </div>
    </main>
  );
}
