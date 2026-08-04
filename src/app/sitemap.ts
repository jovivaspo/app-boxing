import type { MetadataRoute } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";

// Route Handler, cached by default (`seo-metadata` D-4 gotcha) — force
// dynamic so it never bakes the build-time SITE_URL into cached output.
export const dynamic = "force-dynamic";

// Exactly /, /login, /guest-timer. /guest-timer-active is intentionally
// excluded — it depends on local (per-visitor) state, no stable content.
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();

  return [
    { url: `${origin}/` },
    { url: `${origin}/login` },
    { url: `${origin}/guest-timer` },
  ];
}
