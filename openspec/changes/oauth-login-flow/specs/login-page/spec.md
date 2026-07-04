# Delta for Login Page

## ADDED Requirements

### Requirement: Login Button Server Action Integration

The "Continuar con Google" button MUST invoke the `signInWithGoogle` Server Action when clicked. The LoginCard component SHALL be a Client Component to support interactive event handlers.

#### Scenario: Button triggers OAuth flow

- GIVEN the login page is displayed
- WHEN the user clicks "Continuar con Google"
- THEN the `signInWithGoogle` Server Action is invoked
- AND the browser navigates to Google's OAuth consent screen

### Requirement: OAuth Error Display

The login page SHALL display an error message when an `error` query parameter is present in the URL. Error messages MUST be user-friendly and MUST NOT expose internal details.

#### Scenario: Error parameter present

- GIVEN the user is redirected to `/login?error=access_denied`
- WHEN the login page renders
- THEN a visible error message is displayed explaining the authentication failure

#### Scenario: No error parameter

- GIVEN the user navigates to `/login` without query parameters
- WHEN the login page renders
- THEN no error message is displayed

#### Scenario: Unknown error code

- GIVEN the user is redirected to `/login?error=unknown_code`
- WHEN the login page renders
- THEN a generic authentication error message is displayed

### Requirement: Visual Regression Prevention

The login page SHALL render the same visual layout (header, card, button, badges, footer) as before the OAuth integration. No visual regressions SHALL be introduced.

#### Scenario: Layout preservation

- GIVEN the login page renders after OAuth integration
- WHEN the page is inspected at 1280px and 375px viewports
- THEN header, card (heading, subtext, button, badges), and footer appear in the same order and style

## MODIFIED Requirements

### Requirement: Login Page Route

The system MUST serve a login page at `/login`. The root path (`/`) MUST check for a valid `auth_token` session cookie. If the cookie is valid (JWT verified), the user SHALL remain on `/`. If the cookie is absent or invalid, the user MUST be redirected to `/login`. The session check SHALL happen server-side. The page MUST render at desktop (1280px) and mobile (375px) viewports using mobile-first layout.

(Previously: Root path unconditionally redirected to `/login` regardless of authentication state.)

#### Scenario: Navigate to `/login`

- GIVEN the application is running
- WHEN a user navigates to `/login`
- THEN the page renders header, card, and footer sections

#### Scenario: Authenticated user on root path

- GIVEN the user has a valid `auth_token` cookie
- WHEN the user navigates to `/`
- THEN the home page content is displayed (no redirect)

#### Scenario: Unauthenticated user on root path

- GIVEN the user has no `auth_token` cookie or the cookie is invalid/expired
- WHEN the user navigates to `/`
- THEN the system redirects to `/login`

#### Scenario: Server-side session check

- GIVEN the root path is requested
- WHEN the server processes the request
- THEN the JWT verification happens server-side before any client-side rendering
