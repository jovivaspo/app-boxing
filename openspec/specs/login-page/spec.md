# Login Page Specification

## Purpose

Defines the AuthShell login page at `/login` — a presentational entry point for Google OAuth. Covers layout, visual tokens, and interaction states. No authentication logic in scope.

## Requirements

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

### Requirement: Login Card

The system MUST display a centered card (max-width 440px) containing: heading "Bienvenido", subtext "Inicia sesión en tu cuenta", a Google sign-in button, and a security badges row — in that order.

#### Scenario: Card content order

- GIVEN the login page is displayed
- WHEN the card renders
- THEN heading, subtext, Google button, and badges appear top-to-bottom

### Requirement: Google Sign-In Button

The system MUST render a full-width button labeled "Continuar con Google" with an inline multi-color Google SVG icon left of the label. Background: zinc-900 equivalent, text: white. The button MUST provide visible hover and keyboard focus states.

#### Scenario: Button appearance

- GIVEN the card is rendered
- WHEN the button is displayed
- THEN it spans full width with Google "G" icon, dark background, light text

#### Scenario: Hover and focus states

- GIVEN the button is displayed
- WHEN the user hovers or keyboard-tabs to it
- THEN a visible state change (background shift or focus ring) is shown

### Requirement: Security Badges

The system MUST display three badges below the button: "Verificado" (shield), "Encriptado" (lock), "Seguro" (fingerprint). Each badge MUST pair a Lucide icon with its Spanish label.

#### Scenario: Badges render

- GIVEN the card is rendered
- WHEN the badges row displays
- THEN three badges appear with correct icon-label pairs

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

### Requirement: Typography and Design Tokens

The system MUST use Inter font globally (replacing Geist) and set `lang="es"` on the HTML element. Visual tokens MUST follow Stitch Neutral Precision: 4px spacing baseline, 16px mobile margin, zinc-900 primary, zinc-50 background, consistent border radius on card and button.

#### Scenario: Font and language

- GIVEN the application loads
- WHEN the page renders
- THEN Inter is active and `lang="es"` is set

#### Scenario: Design token compliance

- GIVEN the login page is displayed
- WHEN visual tokens are measured
- THEN spacing uses 4px grid, card is 440px max, container is 1280px max, colors match neutral palette
