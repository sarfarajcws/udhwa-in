import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/misc";
import { GoogleSignIn } from "@/components/ui/auth";
import { SIGNIN_ERRORS } from "@/lib/site";
import { safeCallback } from "@/lib/utils";
import { getCurrentUser, getProviders } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({ title: "Sign in", description: "Sign in to contribute to Udhwa.", path: "/signin", noIndex: true });

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const sp = await searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);
  const { google: googleEnabled, reachable } = await getProviders();
  const error = typeof sp.error === "string" ? (SIGNIN_ERRORS[sp.error] ?? "Something went wrong while signing in. Please try again.") : null;

  return (
    <div className="container-page flex justify-center py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Sign in to Udhwa</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          You don’t need an account to browse. Sign in to suggest places and businesses, share photos, write blogs and report corrections — and to
          track what you’ve sent.
        </p>
        {error && <Alert tone="error" className="mt-6">{error}</Alert>}
        <div className="mt-8 space-y-4">
          {!reachable ? (
            <Alert tone="error">Sign-in is temporarily unavailable. Please try again in a moment.</Alert>
          ) : googleEnabled ? (
            <GoogleSignIn callbackUrl={callbackUrl} />
          ) : (
            <Alert tone="warning">Google sign-in isn’t available on this server yet.</Alert>
          )}
        </div>
        <p className="mt-8 text-xs leading-relaxed text-muted">
          We only use your name, email and profile picture from Google. Your profile stays simple — no followers, no feeds.
        </p>
      </div>
    </div>
  );
}
