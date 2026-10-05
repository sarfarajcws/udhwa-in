import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/misc";
import { GoogleSignIn } from "@/components/ui/auth";
import { SIGNIN_ERRORS } from "@/lib/site";
import { safeCallback } from "@/lib/utils";
import { getCurrentUser, getProviders, WEB_URL } from "@/lib/api";
import { SignOutButton } from "./sign-out";

export const metadata = { title: "Sign in" };

export default async function AdminSignIn({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl, "/");
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") redirect(callbackUrl);
  const { google, reachable } = await getProviders();
  const error = typeof sp.error === "string" && sp.error !== "NotAdmin" ? (SIGNIN_ERRORS[sp.error] ?? "Something went wrong while signing in.") : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-slate-900 text-sm font-bold text-white">U</span>
          <h1 className="text-lg font-semibold text-slate-900">Udhwa Admin</h1>
        </div>
        {user ? (
          <div className="mt-6 space-y-4 text-sm text-slate-600">
            <Alert tone="warning">
              {user.email} is signed in but doesn’t have admin access. Admin accounts are set by the Udhwa team in the server configuration (ADMIN_EMAILS).
            </Alert>
            <div className="flex gap-3">
              <SignOutButton />
              <a href={WEB_URL} className="font-medium text-blue-700 hover:underline">Go to the website</a>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-500">Team members only. Sign in with your Google account.</p>
            {error && <Alert tone="error" className="mt-4">{error}</Alert>}
            <div className="mt-6 space-y-4">
              {!reachable ? (
                <Alert tone="error">The Udhwa API can’t be reached right now. Please try again in a moment.</Alert>
              ) : google ? (
                <GoogleSignIn callbackUrl={callbackUrl} />
              ) : (
                <Alert tone="warning">Google sign-in isn’t configured on the API (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).</Alert>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
