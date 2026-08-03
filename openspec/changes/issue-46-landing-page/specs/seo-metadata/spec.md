# Delta for SEO Metadata

(New capability, per Issue #46. Makes `/` crawlable and shareable — the canonical
public origin is not yet known, so binding decision D3 requires the origin to come
from an environment variable with a documented placeholder default.)

## ADDED Requirements

### Requirement: Canonical Site Origin Environment Variable

The system MUST read the canonical public site origin from an environment variable
named `SITE_URL`. This variable is server-only (not prefixed `NEXT_PUBLIC_`, per
AGENTS.md's public-vs-secret convention) — it is consumed only during server-side
metadata generation, never sent to the client bundle. `.env.example` MUST document
`SITE_URL` with a placeholder value. When `SITE_URL` is unset, the system MUST fall
back to a documented placeholder origin (`http://localhost:3000`) rather than
throwing or producing a build failure.

#### Scenario: `SITE_URL` set to the production origin

- GIVEN `SITE_URL` is set to a production origin (e.g. `https://ironpulse.example`)
- WHEN metadata is generated for any page
- THEN `metadataBase` and any absolute URLs derived from it (OG/Twitter images,
  canonical links) resolve against that origin

#### Scenario: `SITE_URL` unset falls back to the documented placeholder

- GIVEN `SITE_URL` is not set in the environment
- WHEN metadata is generated for any page
- THEN the system uses `http://localhost:3000` as `metadataBase` and does not throw
  or fail the build

### Requirement: Landing Page Metadata

`/` MUST export page-level `metadata` that overrides the root layout defaults,
including a `title`, a Spanish-language `description`, `openGraph` fields (title,
description, url, images), and `twitter` fields (card type, title, description,
image).

#### Scenario: Landing metadata is complete for sharing

- GIVEN a crawler or link-preview service requests `/`
- WHEN the response's metadata is inspected
- THEN `title`, `description`, `openGraph`, and `twitter` are all present and
  resolve to absolute URLs via `metadataBase`

### Requirement: Robots Directives

The system MUST expose `app/robots.ts` as a typed `MetadataRoute.Robots` that allows
crawling of the public routes (`/`, `/login`, `/guest-timer`) and references the
sitemap's location.

#### Scenario: `/robots.txt` resolves and references the sitemap

- GIVEN the application is running
- WHEN `/robots.txt` is requested
- THEN it resolves successfully and its content references the sitemap URL

### Requirement: Sitemap Surface

The system MUST expose `app/sitemap.ts` as a typed `MetadataRoute.Sitemap` listing
exactly `/`, `/login`, and `/guest-timer`. It MUST NOT list `/guest-timer-active`,
since that route depends on local (per-visitor) state and has no stable canonical
content to index.

#### Scenario: `/sitemap.xml` lists exactly the public routes

- GIVEN the application is running
- WHEN `/sitemap.xml` is requested
- THEN it resolves successfully and lists exactly `/`, `/login`, and `/guest-timer`
  — no more, no fewer entries

#### Scenario: The guest-active route is excluded

- GIVEN the sitemap is generated
- WHEN its entries are inspected
- THEN `/guest-timer-active` does not appear
