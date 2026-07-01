export interface NavLink {
  label: string;
  href: string;
}

export const SITE_NAME = "CA Roshan";
export const SITE_TAGLINE = "Clear thinking on tax, finance, and policy";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "contact@caroshan.com";
export const LINKEDIN_URL = "https://www.linkedin.com/in/ca-roshan"; // TODO: replace with the real LinkedIn profile URL

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Blog", href: "/blog" },
  { label: "Categories", href: "/categories" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];
