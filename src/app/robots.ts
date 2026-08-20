import type { MetadataRoute } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/guest-timer"],
      disallow: ["/api", "/profile", "/timers", "/guest-timer-active"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
