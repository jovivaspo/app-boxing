import type { MetadataRoute } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";

// Route Handler, cached by default (`seo-metadata` D-4 gotcha) — force
// dynamic so it never bakes the build-time SITE_URL into cached output.
export const dynamic = "force-dynamic";

/**
 * `allow` alone would be a no-op: in robots.txt an `Allow` only carves an
 * exception out of a `Disallow`'d path, so anything unlisted stays crawlable.
 * The `disallow` list is what actually keeps the authenticated app and the API
 * out of the index, and it mirrors `sitemap.ts`'s exclusions.
 *
 * `/guest-timer-active` needs its own entry despite `/guest-timer` being
 * allowed: robots paths match by prefix, so the allow would otherwise cover it.
 * Longest-match wins, so the more specific disallow does.
 *
 * This list enumerates private routes rather than allow-listing public ones —
 * a new private route must be added here, which is the maintenance cost of
 * robots.txt having no way to express "deny everything except these".
 */
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
