import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/forgot-password", "/reset-password", "/member/", "/admin/", "/auth/", "/api/", "/access-denied"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
