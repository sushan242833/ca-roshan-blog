import { FEATURES } from "@/config/features";

export interface NavLink {
  label: string;
  href: string;
}

export const SITE_NAME = "CA Roshan";
export const SITE_TAGLINE = "Clear thinking on tax, finance, and policy";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "contact@caroshan.com";
export const LINKEDIN_URL = "https://www.linkedin.com/in/ca-roshan"; // TODO: replace with the real LinkedIn profile URL

function resolveApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (value) {
    return value;
  }

  // A missing value doesn't just break API calls — next.config.ts derives the
  // CSP connect-src and image remotePatterns from this same variable, so an
  // unset value also silently narrows the CSP. Fail loudly in production
  // instead of degrading into hard-to-diagnose same-origin request failures.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. It is required in production: " +
        "API requests fall back to failing same-origin calls, and " +
        "next.config.ts also derives the CSP connect-src and image " +
        "remotePatterns from it, so a missing value silently narrows the CSP.",
    );
  }

  // Development keeps the same-origin ("") fallback.
  return "";
}

export const API_BASE_URL = resolveApiBaseUrl();

// A nav link may be gated behind a feature flag. Gated links are filtered out of
// the exported NAV_LINKS when their flag is off, so header.tsx needs no changes.
type GatedNavLink = NavLink & { feature?: keyof typeof FEATURES };

const ALL_NAV_LINKS: GatedNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Categories", href: "/categories" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact", feature: "contactPage" },
];

export const NAV_LINKS: NavLink[] = ALL_NAV_LINKS.filter(
  (link) => !link.feature || FEATURES[link.feature],
).map(({ label, href }) => ({ label, href }));
