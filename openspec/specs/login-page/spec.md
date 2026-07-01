# Login Page Specification

## Purpose

Defines the AuthShell login page at `/login` — a presentational entry point for Google OAuth. Covers layout, visual tokens, and interaction states. No authentication logic in scope.

## Requirements

### Requirement: Login Page Route

The system MUST serve a login page at `/login`. The root path (`/`) MUST redirect to `/login`. The page MUST render at desktop (1280px) and mobile (375px) viewports using mobile-first layout.

#### Scenario: Navigate to `/login`

- GIVEN the application is running
- WHEN a user navigates to `/login`
- THEN the page renders header, card, and footer sections

#### Scenario: Root path redirect

- GIVEN the application is running
- WHEN a user navigates to `/`
- THEN the system redirects to `/login`

### Requirement: Login Header

The system MUST display a header with brand "AuthShell", navigation tabs ("Login" active, "Sign Up" inactive), and a "Help" link. Container max-width: 1280px, centered.

#### Scenario: Header renders

- GIVEN the login page is displayed
- WHEN the header renders
- THEN brand, active Login tab, inactive Sign Up tab, and Help link are visible

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

The system MUST display a footer with "AuthShell", legal links ("Terms of Service", "Privacy Policy", "Contact"), and "© 2024". Same max-width as header.

#### Scenario: Footer renders

- GIVEN the login page is displayed
- WHEN the footer renders
- THEN company name, three legal links, and copyright are visible

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
