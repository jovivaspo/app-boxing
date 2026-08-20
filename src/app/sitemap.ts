import type { MetadataRoute } from "next";

import { siteUrl } from "@/infraestructure/config/site-url";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();

  return [
    { url: `${origin}/` },
    { url: `${origin}/login` },
    { url: `${origin}/guest-timer` },
  ];
}
