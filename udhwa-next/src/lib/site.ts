/**
 * Brand-level constants shared by server and client code.
 * Place-specific details (the primary locality) come from the database,
 * so the platform is not hard-wired to one town.
 */
export const site = {
  name: "Udhwa",
  domain: "udhwa.in",
  tagline: "Your City’s Digital Home",
  description:
    "Udhwa is a digital home for a place and its community — places, businesses, services, news, blogs and photos, maintained with care and verified by the Udhwa team.",
  // Public website URL. NEXT_PUBLIC_SITE_URL in the Next apps, WEB_URL in the API.
  url: (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEB_URL || "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_IN",
  /** Public contact address (NEXT_PUBLIC_CONTACT_EMAIL), shown on the contact page and in structured data. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@udhwa.in",
  founder: "Sarfaraj Alam",
};

export const publicNav = [
  { href: "/places", label: "Places" },
  { href: "/businesses", label: "Businesses" },
  { href: "/services", label: "Services" },
  { href: "/news", label: "News" },
  { href: "/blogs", label: "Blogs" },
  { href: "/photos", label: "Photos" },
] as const;

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//.test(path)) return path;
  return `${site.url}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Messages for /signin?error=… (set by the API's OAuth callback). */
export const SIGNIN_ERRORS: Record<string, string> = {
  Suspended: "This account has been suspended. Contact the Udhwa team if you think this is a mistake.",
  AccessDenied: "Sign-in was cancelled or denied.",
  OAuthState: "Your sign-in session expired. Please try again.",
  OAuthCallback: "Google sign-in didn’t complete. Please try again.",
  GoogleNotConfigured: "Google sign-in isn’t configured on this server yet.",
  TooManyAttempts: "Too many sign-in attempts. Please wait a few minutes and try again.",
};
