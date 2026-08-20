const FALLBACK_SITE_URL = "http://localhost:3000";

export function siteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured) return FALLBACK_SITE_URL;

  return URL.canParse(configured) ? configured : FALLBACK_SITE_URL;
}
