# Delta for Login Page

(Issue #46. D1 makes `/` a public landing with no session-based redirect, so the
root-path redirect behavior bundled into the existing "Login Page Route" requirement
is removed. D2 moves session-aware navigation into the shared `Topbar`/`Footer`
(`app-shell` capability), so "Login Header" and "Login Footer" are re-expressed
against the shared shell instead of the page-specific components they used to name.
D-1b (binding, design.md) adds an authenticated-visitor guard on `/login` itself —
a session redirects to `/timers` before render — which also makes the Topbar's
logged-in state unreachable on `/login`, correcting "Login Header" below.)

## MODIFIED Requirements

### Requirement: Login Page Route

The system MUST serve a login page at `/login`. The page MUST render at desktop
(1280px) and mobile (375px) viewports using mobile-first layout. `/login` MUST NOT
depend on or perform any redirect from `/` — the root path is a separate, public
landing page (see `landing-page` capability) and is out of this requirement's scope.

(Previously: this requirement also stated the root path (`/`) MUST redirect to
`/login`. That clause and its "Root path redirect" scenario are removed — `/` is now
a public landing page per binding decision D1, not a redirect source.)

#### Scenario: Navigate to `/login`

- GIVEN the application is running
- WHEN a user navigates to `/login`
- THEN the page renders the shared Topbar, the Login Card, and the shared Footer

### Requirement: Login Header

`/login` MUST render the shared Topbar (per the `app-shell` capability) in place of
a page-specific header. Because `/login`'s authenticated-visitor guard (see
"Authenticated Visitors Are Redirected Away From `/login`" below) redirects away
before render whenever a session exists, `/login` MUST render the Topbar
unconditionally in its logged-out state — the logged-in state is unreachable on this
route and MUST NOT be branched on here.

(Previously: this requirement described a bespoke, non-session-aware `LoginHeader`
with static "Login"/"Sign Up"/"Help" nav items. That component is removed; its
behavior is superseded by the shared Topbar defined in `app-shell`. An earlier
version of this delta also stated the Topbar would render its logged-in state if a
session existed on `/login` — corrected here because the new guard makes that case
unreachable.)

#### Scenario: Header renders as the shared Topbar, always logged-out

- GIVEN the login page renders at all (which, per the guard, means no session exists)
- WHEN the header area renders
- THEN it is the shared Topbar in its logged-out state, per `app-shell` — never the
  logged-in state

### Requirement: Login Footer

`/login` MUST render the shared Footer (per the `app-shell` capability) in place of
a page-specific footer. Its content (brand, legal links, copyright) is defined by
`app-shell` and MUST NOT differ from what `/` renders.

(Previously: this requirement described a page-specific `LoginFooter` component.
That component is removed; its behavior is superseded by the shared Footer defined
in `app-shell`.)

#### Scenario: Footer renders as the shared Footer

- GIVEN the login page is displayed
- WHEN the footer area renders
- THEN it is the shared Footer, with the same brand, legal links, and copyright
  content defined by `app-shell`

## ADDED Requirements

### Requirement: Authenticated Visitors Are Redirected Away From `/login`

`/login` MUST check for an existing session before rendering. If a session exists,
`/login` MUST redirect to `/timers` and MUST NOT render the login page. If no
session exists, `/login` MUST render normally (per "Login Page Route", "Login
Header", "Login Footer").

#### Scenario: Authenticated visitor is redirected to `/timers`

- GIVEN a valid session exists
- WHEN a visitor navigates to `/login`
- THEN the system redirects to `/timers` and the login page does not render

#### Scenario: Anonymous visitor sees the login page

- GIVEN no session exists
- WHEN a visitor navigates to `/login`
- THEN the login page renders normally — no redirect occurs

## REMOVED Requirements

### Requirement: Root path redirect

(Reason: binding decision D1 — `/` becomes a public landing page for everyone; there
is no session-based redirect on `/` anymore. This was previously a scenario bundled
inside "Login Page Route"; it is called out here explicitly per Issue #46's
instruction to make the removal unambiguous.)
(Migration: none — `/` now serves the `landing-page` capability directly. No
existing `/login` behavior depends on the redirect having happened.)
