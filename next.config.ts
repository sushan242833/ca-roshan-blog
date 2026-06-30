import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Skip optimization in dev — Next.js server-side fetcher blocks private IPs
    // (localhost/127.0.0.1), but the browser can reach localhost:4000 directly.
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_IMAGE_HOSTNAME ?? "localhost",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
