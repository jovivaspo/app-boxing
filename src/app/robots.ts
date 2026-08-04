import type { MetadataRoute } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";

// Route Handler, cached by default (`seo-metadata` D-4 gotcha) — force
// dynamic so it never bakes the build-time SITE_URL into cached output.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/guest-timer"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
