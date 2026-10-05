"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/components/ui/auth";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
