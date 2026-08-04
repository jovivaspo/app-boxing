const FALLBACK_SITE_URL = "http://localhost:3000";

/**
 * Canonical public site origin (D-4, `seo-metadata` capability). Reads the
 * server-only `SITE_URL` env var and falls back to a documented placeholder
 * when it is unset, empty, or not a parseable absolute URL.
 *
 * The malformed case matters: callers feed this straight into `new URL()`,
 * and the root layout does so at module scope. Throwing here would take every
 * route down over a misconfigured deploy (e.g. `SITE_URL=ironpulse.example`
 * with no scheme), so an unusable value degrades to the placeholder instead.
 */
export function siteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured) return FALLBACK_SITE_URL;

  return URL.canParse(configured) ? configured : FALLBACK_SITE_URL;
}
