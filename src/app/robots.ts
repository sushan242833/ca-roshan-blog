import type { MetadataRoute } from "next";
import { SITE_URL } from "@/config/site.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/blogs/preview/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
