"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import type { ActionState } from "@/lib/json";

/** Calls a bound server action with optional confirmation, then refreshes. */
export function ActionButton({ action, confirmText, className, children, title }: {
  action: () => Promise<ActionState>;
  confirmText?: string;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      title={title}
      className={className}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r?.error) window.alert(r.error);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
