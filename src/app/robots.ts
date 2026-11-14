import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/forgot-password", "/reset-password", "/member/", "/admin/", "/auth/", "/api/", "/survey/member-onboarding", "/access-denied"],
    },
    sitemap: "https://csc.logicintelligencetechnologies.in/sitemap.xml",
    host: "https://csc.logicintelligencetechnologies.in",
  };
}
