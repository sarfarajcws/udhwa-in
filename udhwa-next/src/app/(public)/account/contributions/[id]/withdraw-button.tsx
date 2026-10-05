"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { withdrawContribution } from "@/server/actions";

export function WithdrawButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
      onClick={() => {
        if (!confirm("Withdraw this contribution? The team won’t review it.")) return;
        start(async () => {
          const r = await withdrawContribution(id);
          if (r.error) alert(r.error);
          router.refresh();
        });
      }}
    >
      {pending ? "Withdrawing…" : "Withdraw"}
    </button>
  );
}
