"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="container-page flex-1 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink">This page didn’t load properly</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">It’s not you. Please try again — if it keeps happening, let us know.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted">Ref: {error.digest}</p>}
      <Button className="mt-8" onClick={reset}>Try again</Button>
    </main>
  );
}
