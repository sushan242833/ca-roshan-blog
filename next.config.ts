import type { NextConfig } from "next";
import path from "path";

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Safely extract the origin (protocol + hostname + port) from an arbitrary URL
// string so the build never crashes on a missing or malformed env variable.

/** Returns the URL origin (e.g. "http://localhost:4000") or null. */
function parseOrigin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

/** Converts an origin string to a Next.js remotePattern, or null on failure. */
function toRemotePattern(origin: string | null): RemotePattern | null {
  if (!origin) return null;
  try {
    const { protocol, hostname, port } = new URL(origin);
    const pattern: RemotePattern = {
      protocol: protocol.replace(":", "") as "http" | "https",
      hostname,
      pathname: "/uploads/**",
    };
    if (port) pattern.port = port;
    return pattern;
  } catch {
    return null;
  }
}

// ─── Environment ──────────────────────────────────────────────────────────────
// All runtime-dependent values are derived from env vars so the same build
// artifact works in every environment — only env var changes are needed.
const isProduction = process.env.NODE_ENV === "production";
const apiOrigin = parseOrigin(process.env.NEXT_PUBLIC_API_BASE_URL);

// Media is served from Cloudinary's CDN in production, so its host must be
// allowed by both the image optimizer and the CSP. Without this, every uploaded
// image renders as a broken <img> and the console fills with CSP violations.
const CLOUDINARY_HOSTNAME = "res.cloudinary.com";
const CLOUDINARY_ORIGIN = `https://${CLOUDINARY_HOSTNAME}`;

// ─── Remote image patterns ────────────────────────────────────────────────────
// Authorise Next.js image optimisation to proxy images from the API server
// and from Google (admin avatars may be served from Google accounts).
const remotePatterns: RemotePattern[] = [
  toRemotePattern(apiOrigin),
  {
    protocol: "https",
    hostname: CLOUDINARY_HOSTNAME,
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
  },
].filter((p): p is RemotePattern => p !== null);

// ─── Security headers ─────────────────────────────────────────────────────────
// Applied to every route. CSP includes unsafe-eval in development so that
// Next.js hot-module replacement (which eval()s modules) continues to work.
// HSTS is omitted in development so local HTTP connections still work.
const imgSources = [
  "'self'",
  "data:",
  "blob:",
  "https://lh3.googleusercontent.com",
  CLOUDINARY_ORIGIN,
];
if (apiOrigin) imgSources.push(apiOrigin);

const connectSources = ["'self'", CLOUDINARY_ORIGIN];
if (apiOrigin) connectSources.push(apiOrigin);
// Turbopack/HMR opens a dev websocket; allow it so dev doesn't log CSP
// violations. Not added in production (no HMR there).
if (!isProduction) connectSources.push("ws:", "wss:");

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required in production too: the App Router bootstraps
  // every page through inline RSC-payload scripts, so `script-src 'self'`
  // alone blocks hydration entirely (pages freeze on their SSR output).
  // Dropping it would require per-request nonces via middleware, which forces
  // all pages — including the static/ISR public pages — to render dynamically.
  isProduction
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src ${imgSources.join(" ")}`,
  `connect-src ${connectSources.join(" ")}`,
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

// ─── Next.js config ───────────────────────────────────────────────────────────
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),

  // Feature flags inlined at build time so client components (e.g. the nav in
  // header.tsx) can read them. Default "0" (off) when the var is unset.
  env: {
    FEATURE_FLAG_CONTACT_PAGE: process.env.FEATURE_FLAG_CONTACT_PAGE ?? "0",
  },

  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    // In development Next.js cannot fetch localhost:* server-side (private IP
    // security block). Skip the optimizer so images load from the backend directly.
    // In production the optimizer runs normally via remotePatterns.
    unoptimized: !isProduction,
    remotePatterns,
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
