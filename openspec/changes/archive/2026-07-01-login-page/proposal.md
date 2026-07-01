# Proposal: Login Page — Stitch Design

## Intent

Replace the default Vercel homepage with a `/login` route implementing the AuthShell login page from the Google Stitch design (Neutral Precision theme). Users need a branded entry point to authenticate via Google OAuth.

## Scope

### In Scope
- `/login` route (`src/app/login/page.tsx`) replacing the default homepage
- AuthShell header with brand, Login/Sign Up tabs, Help link
- Centered login card: "Bienvenido" heading, "Inicia sesión en tu cuenta" subtext, Google "Continuar con Google" button (zinc-900, full-width, multi-color SVG icon)
- Security badges row (verified, encrypted, secure)
- Legal footer (Terms of Service, Privacy Policy, Contact, © 2024)
- Font swap: Geist → Inter, `lang="es"`, metadata update
- shadcn/ui additions: Card, Separator

### Out of Scope
- OAuth token exchange, session management, callback handling
- Sign-up page, password login, form inputs
- Dark mode support (deferred)
- Responsive menu (static links only)
- Tests (per user directive: no tests for now)

## Capabilities

### New Capabilities
- `login-page`: Login page route with Google OAuth button, site header, and legal footer. Spec SHALL cover layout, visual tokens, and component contracts.

### Modified Capabilities
None — first behavioral change in the project.

## Approach

Pure presentational UI. No domain/application/infrastructure layers touched — this is a static page per the Clean/Hexagonal skill's "Skip When" rule. Components follow container-presentational pattern: `login/page.tsx` as composition root, sub-components in `src/ui/components/`. Mobile-first with Tailwind v4 utilities matching Stitch tokens (4px baseline, 16px mobile margin, `max-w-[440px]` card, 1280px max container, Inter font).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/layout.tsx` | Modified | Geist → Inter, lang="es", metadata |
| `src/app/page.tsx` | Modified | Vercel template → redirect to `/login` |
| `src/app/login/page.tsx` | New | Login route page |
| `src/ui/components/` | New (5) | login-header, login-card, login-footer, google-icon, security-badges |
| `package.json` | Modified | shadcn add card + separator |
| `globals.css` typography | Modified | `--font-sans` maps to Inter |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stitch tokens mismatch with shadcn neutral theme | Low | Both use zinc-900 primary; globals.css already compatible |
| Geist removal breaks other pages | Low | Only homepage exists; rename `--font-sans` to Inter variable |
| Next.js 16 App Router breaking changes | Low | Static page — no server APIs used |

## Rollback Plan

1. Revert `layout.tsx`: restore Geist imports, `lang="en"`, original metadata
2. Restore `page.tsx` from Vercel template
3. Delete `src/app/login/` directory and 5 new components
4. Uninstall shadcn Card/Separator if unused elsewhere
5. `npm run build && npm run lint` to verify clean state

## Dependencies

- Stitch design (Neutral Precision theme, project 4138051788955982573)
- shadcn/ui Card and Separator (`npx shadcn add card separator`)

## Success Criteria

- [ ] `/login` route renders without errors at desktop (1280px) and mobile (375px)
- [ ] Visual output matches Stitch design tokens (colors, spacing, radius, font)
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] "Continuar con Google" button is focusable and has hover state
- [ ] `lang="es"` set on `<html>`, Inter font applied globally
