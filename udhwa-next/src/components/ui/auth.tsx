"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "./button";

/**
 * Browser-side session helpers shared by web and admin. Both apps proxy
 * /api/v1/* to the Udhwa API, so these calls are same-origin and carry the
 * httpOnly session cookie automatically.
 */

export type SessionUser = { id: string; name: string | null; email: string | null; image: string | null; role: "USER" | "ADMIN"; username: string | null };
type SessionState = { user: SessionUser | null; status: "loading" | "authenticated" | "unauthenticated"; refresh: () => Promise<void> };

const SessionContext = createContext<SessionState>({ user: null, status: "loading", refresh: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me", { cache: "no-store" });
      const json = res.ok ? await res.json() : { user: null };
      setUser(json.user ?? null);
      setStatus(json.user ? "authenticated" : "unauthenticated");
    } catch {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);
  useEffect(() => {
    // Fetching the session is a subscription to external state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  return <SessionContext.Provider value={{ user, status, refresh }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

export async function signOut(callbackUrl = "/") {
  await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
  window.location.assign(callbackUrl);
}

export function GoogleSignIn({ callbackUrl }: { callbackUrl: string }) {
  return (
    <a href={`/api/v1/auth/google?returnTo=${encodeURIComponent(callbackUrl)}`} className={buttonClass("secondary", "lg", "w-full")}>
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      Continue with Google
    </a>
  );
}
