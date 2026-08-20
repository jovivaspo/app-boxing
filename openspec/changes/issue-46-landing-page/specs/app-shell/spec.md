# Delta for App Shell

(New capability, per Issue #46. Generalizes the login-only `login-header` /
`login-footer` into a session-aware `Topbar` and a route-agnostic `Footer`, shared by
`/` and `/login` — binding decision D2. How the Topbar obtains the session on `/` is
an implementation mechanism deferred to `sdd-design`; the requirements below describe
only the observable result, so either a server-passed prop or a client-side read
satisfies them equally.)

## ADDED Requirements

### Requirement: Session-Aware Topbar Navigation

The shared Topbar MUST reflect the current session state of the route it is rendered
on. When no session exists, it MUST display a sign-in affordance linking to
`/login`. When a session exists, it MUST display links to `/profile` and `/timers`,
plus a control that ends the session (equivalent to the existing `/api/logout`
behavior), and MUST NOT display the sign-in affordance in that state.

#### Scenario: Logged-out visitor sees the sign-in affordance

- GIVEN no session exists on the current route
- WHEN the Topbar renders
- THEN a sign-in affordance linking to `/login` is visible, and no `/profile`,
  `/timers`, or logout control is shown

#### Scenario: Logged-in visitor sees app links and logout

- GIVEN a valid session exists on the current route
- WHEN the Topbar renders
- THEN links to `/profile` and `/timers` and a logout control are visible, and the
  sign-in affordance is not shown

### Requirement: Topbar Is Shared Across Routes

The same Topbar component MUST be used on both `/` and `/login`, driven by each
route's own session state — it MUST NOT be a page-specific header duplicated per
route. `/login` MUST only ever render the Topbar in its logged-out state: per the
`login-page` capability's authenticated-visitor guard, a session on `/login` redirects
to `/timers` before any render, so the Topbar's logged-in state is unreachable there.
`/` renders whichever Topbar state matches its own session.

#### Scenario: `/` renders the Topbar matching its own session state

- GIVEN a session state (present or absent) on `/`
- WHEN `/` renders
- THEN the Topbar shows the matching state — logged-out or logged-in — per the
  "Session-Aware Topbar Navigation" requirement

#### Scenario: `/login` only ever renders the logged-out Topbar

- GIVEN `/login` renders at all (i.e. no session exists, per the `login-page` guard)
- WHEN the Topbar renders on `/login`
- THEN it is always the logged-out state — the logged-in state never appears on
  `/login`

### Requirement: No Functioning Registration Entry Point

The shared Topbar MUST NOT provide a functioning registration/sign-up entry point. If
a "Registrarse" (or equivalent) affordance is present, it MUST remain visually
disabled and non-interactive, consistent with the pre-change `LoginHeader`.

#### Scenario: Registration affordance stays disabled

- GIVEN the Topbar renders, in any session state
- WHEN a "Registrarse" affordance is present
- THEN it is disabled and does not navigate anywhere when activated

### Requirement: Shared Footer

A shared Footer component MUST render on both `/` and `/login`, displaying the brand
name, the legal links ("Términos de Servicio", "Política de Privacidad", "Contacto"),
and the copyright line, unchanged in content from the current `/login` footer. The
Footer's content MUST NOT vary with session state.

#### Scenario: Footer renders identically regardless of session or route

- GIVEN any combination of route (`/` or `/login`) and session state
- WHEN the Footer renders
- THEN the same brand name, the same three legal links, and the same copyright line
  are shown

### Requirement: Login Page Adopts the Shared Shell Without Regression

`/login` MUST render using the shared Topbar and Footer instead of the removed
`login-header`/`login-footer` components. This adoption MUST NOT change `/login`'s
Google OAuth sign-in flow or the visible content the Login Card/security badges
present.

#### Scenario: `/login` renders the shared shell

- GIVEN a visitor with no session navigates to `/login`
- WHEN the page renders
- THEN the shared Topbar (logged-out state) and shared Footer render around the
  existing Login Card, and the Google sign-in flow completes exactly as before this
  change
