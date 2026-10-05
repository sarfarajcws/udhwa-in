"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

/** Runs `fn` during render when the route changes (React's "adjust state on prop change" pattern). */
export function useOnPathChange(fn: () => void) {
  const pathname = usePathname();
  const [prev, setPrev] = useState(pathname);
  if (pathname !== prev) {
    setPrev(pathname);
    fn();
  }
}
