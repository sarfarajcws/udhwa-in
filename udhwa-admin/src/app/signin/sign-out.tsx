"use client";

import { signOut } from "@/components/ui/auth";

export function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut("/signin")} className="font-medium text-slate-700 hover:underline">
      Sign out
    </button>
  );
}
