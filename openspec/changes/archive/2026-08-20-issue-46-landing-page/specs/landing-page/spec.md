# Delta for Landing Page

(New capability, per Issue #46. `/` stops being a session-gated redirect target and
becomes a public marketing entry point — binding decisions D1/D2/D3.)

## ADDED Requirements

### Requirement: Public Landing Route (`/`)

The system MUST serve a public marketing landing page at `/`. The route MUST NOT
redirect based on session state: an anonymous visitor and an authenticated visitor
both receive the landing page, never a redirect to `/login` or elsewhere.

#### Scenario: Anonymous visitor lands on `/`

- GIVEN no session exists
- WHEN a visitor navigates to `/`
- THEN the landing page renders directly, with no redirect

#### Scenario: Authenticated visitor lands on `/`

- GIVEN a valid session exists
- WHEN a visitor navigates to `/`
- THEN the landing page renders directly, with no redirect

### Requirement: Landing Body Is Session-Agnostic

The landing page's body content (hero, benefit block, closing call-to-action) MUST be
identical regardless of session state. Any session-aware navigation or shortcut (e.g.
links to `/profile`, `/timers`, or a logout control) MUST appear only in the shared
Topbar (`app-shell` capability), never inside the landing body itself.

#### Scenario: Authenticated visitor sees no extra shortcut in the body

- GIVEN a valid session exists
- WHEN the landing page body renders
- THEN it contains no authenticated-only shortcut, greeting, or personalization —
  the body is byte-for-byte the same markup an anonymous visitor would see

### Requirement: Hero Section

The landing page MUST render a hero section stating the product promise, with a
primary call-to-action labeled "Probar el timer" linking to `/guest-timer`, and a
secondary call-to-action labeled "Iniciar sesión" linking to `/login`. The primary
CTA MUST be visually and structurally prioritized over the secondary one (e.g. first
in reading order, greater visual weight).

#### Scenario: Hero renders both CTAs

- GIVEN a visitor on `/`
- WHEN the hero section renders
- THEN "Probar el timer" (linking to `/guest-timer`) and "Iniciar sesión" (linking to
  `/login`) are both visible, with "Probar el timer" prioritized as the primary action

#### Scenario: Primary CTA navigates to the guest timer

- GIVEN a visitor on `/`
- WHEN "Probar el timer" is activated
- THEN the browser navigates to `/guest-timer`

#### Scenario: Secondary CTA navigates to login

- GIVEN a visitor on `/`
- WHEN "Iniciar sesión" is activated
- THEN the browser navigates to `/login`

### Requirement: Benefit Block

The landing page MUST render a block of exactly three benefit/feature items
describing the product.

#### Scenario: Exactly three benefit items render

- GIVEN a visitor on `/`
- WHEN the benefit block renders
- THEN exactly three distinct items are visible, each with its own label/description

### Requirement: Closing Call-to-Action

The landing page MUST render a closing call-to-action section, distinct from the
hero, that lets the visitor reach the guest timer flow (`/guest-timer`) and/or the
sign-in flow (`/login`), consistent with the hero's CTA priority (guest timer as the
lower-friction path).

#### Scenario: Closing CTA reaches the guest timer or login

- GIVEN a visitor scrolls to the bottom of `/`
- WHEN the closing CTA section renders
- THEN it offers at least a path to `/guest-timer`, consistent with it being the
  product's primary, no-signup entry point

### Requirement: No Root-Path Auth Gate

`/` MUST NOT perform any session check that blocks or redirects rendering of the
landing body. A session read MAY still occur (e.g. to drive the shared Topbar's
session-aware state per `app-shell`), but it MUST NOT change whether the landing
body itself renders.

#### Scenario: Landing renders even if session resolution fails

- GIVEN the session adapter fails closed (resolves to no session) for any reason
- WHEN a visitor navigates to `/`
- THEN the landing body still renders in full — only the Topbar's session-dependent
  state is affected, per `app-shell`
