# Design: Public Landing Page & Shared App Shell

Issue: #46 · Specs: `landing-page`, `app-shell`, `seo-metadata`, `login-page`
Visual reference: Stitch screen `c76dd86876b94e90b1c42ed3c54a1d2f` (translated, not copied).

## Technical Approach

`/` becomes a thin Server-Component composition root: it reads the session once, hands
it to a shared presentational `Topbar`, and renders three static marketing sections plus
a shared `Footer`. `/login` adopts the same shell. SEO adds `metadataBase`, page
`metadata`, `robots.ts`, and `sitemap.ts`, all fed by one env-reading infra helper.
No new dependency, no new design token, no `next.config.ts` change.

## Architecture Decisions

### D-1 — Topbar reads the session as a server prop (proposal Option A, confirmed)

| Option                                                    | Tradeoff                                                          | Verdict    |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ---------- |
| **A. Composition root passes `session: Session \| null`** | `/` and `/login` are `force-dynamic`; no CDN caching of the shell | **Chosen** |
| B. Client hook + Server Action (A1/A2)                    | `/` stays static, but the topbar flashes logged-out               | Rejected   |

**Rationale (verified, not inherited).** `next.config.ts` sets `output: "standalone"` with
no CDN and no `cacheComponents`, so B buys latency only — SSR HTML is fully crawlable
(`node_modules/next/dist/docs/01-app/02-guides/rendering-philosophy.md`). B's cost is a
visible flash on a marketing page and a repeat of the issue #44 hydration pattern.
`Topbar` stays presentational; no AGENTS.md exception is needed.

Scope: this decision governs `/` only. `/login` is settled separately by D-1b.

### D-1b — `/login` guards authenticated visitors to `/timers` (binding user decision)

An authenticated user has no business on `/login`; the logout affordance lives in the
Topbar. So `src/app/login/page.tsx` gains a guard — `getCurrentSession(...)` returning a
session means `redirect("/timers")`.

Consequence: **every visitor who actually renders `/login` is logged out**, so `/login`
renders the Topbar's logged-out variant unconditionally. No session prop is threaded into
that page and nothing on it branches on session state.

`/login` still gets `export const dynamic = "force-dynamic"`, but because of the **guard**,
not the Topbar. Rationale is mirrored verbatim from `src/app/page.tsx` (and reused in
`src/app/profile/page.tsx`): the session adapter can fail closed to `null` _before_ touching
`cookies()`, so Next.js's build-time dynamic-API detection would miss the dynamic usage and
bake a session-gated route into a static page. Session-gated routes must never be statically
prerendered. `/login` is fully static today (it renders `LoginHeader`/`LoginCard`/`LoginFooter`
and reads no session), so this guard is genuinely new behavior, not a refactor.

**Spec follow-up (for `sdd-tasks`, do not edit here):** neither `openspec/specs/login-page/spec.md`
nor this change's `specs/login-page/spec.md` delta covers the guard, and the delta's "Login
Header" requirement still asserts the Topbar renders its logged-in state on `/login` when a
session exists — now unreachable. `sdd-tasks` MUST schedule a spec-delta amendment adding an
authenticated-visitor guard requirement (`/login` + session → redirect `/timers`) and
correcting that "Login Header" clause to logged-out-only.

### D-1c — Post-login destination becomes `/timers` (binding user decision)

`src/infraestructure/actions/google-login/google-login.action.ts:44` changes from
`redirect("/")` to `redirect("/timers")`. The user explicitly accepted touching the OAuth
flow, overriding the proposal's "no change to the Google OAuth flow" boundary; without it a
user who just signed in would land on the marketing page. One-line edit, no signature or
error-mapping change. Same concern as D-1b (authenticated users belong in the app, not on
the public surface), so both ship in **PR1**.

### D-2 — Shell wired per page, no layout and no route group

No nested layout exists today. A shared layout scoped to exactly `/` + `/login` requires a
`(shell)` route group (moving both `page.tsx` files) and still cannot receive per-page
props; a cookie-reading layout would also force every descendant route dynamic. Two pages
import `Topbar`/`Footer` directly — smaller diff, explicit composition roots.

### D-3 — Mobile menu deferred

Not shipped. Logged-out nav is 1 link + the disabled "Registrarse"; logged-in is 3 items —
they fit at 375px as `font-mono` uppercase micro-labels. Shipping the Stitch hamburger
needs a shadcn primitive that is **not installed** (`sheet`/`dropdown-menu`; only `button`,
`card`, `dialog`, `input`, `separator`, `switch` exist), a `"use client"` boundary, a
`topbar.hook.ts`, and its test — pure cost against a budget already over. `Topbar` therefore
ships with **zero client JS**; logout stays `<form action="/api/logout" method="post">`.

### D-4 — `SITE_URL` confirmed, resolved through one infra helper

`src/infraestructure/config/site-url.ts` exports `siteUrl(): string` returning
`process.env.SITE_URL` when it is set AND parses as an absolute URL (`URL.canParse`), and
`http://localhost:3000` otherwise — unset, empty, or malformed all degrade to the
placeholder. Validating rather than only null-checking is deliberate: callers feed the
result straight into `new URL()` at module scope, so a value like `ironpulse.example` with
no scheme would throw and take every route down instead of degrading. Env reads belong to
infra; `app/` is the composition root that consumes it. `page.tsx` sets
`metadataBase: new URL(siteUrl())`;
`robots.ts` and `sitemap.ts` build absolute URLs from it. `metadataBase` deliberately does
NOT sit on `layout.tsx`: the layout wraps `/guest-timer` and `/guest-timer-active`, which are
statically prerendered, so a base there would be evaluated at build time and bake the
build-time origin into their metadata. The landing is the only route with relative metadata
URLs and already renders per request. `.env.example` gains
`SITE_URL=http://localhost:3000` (AGENTS.md requires the template stay current);
server-only, never `NEXT_PUBLIC_`.

**Gotcha:** `robots.ts`/`sitemap.ts` are Route Handlers **cached by default**
(`.../03-file-conventions/01-metadata/robots.md`, `.../sitemap.md`), so they would bake the
build-time env value. Both get `export const dynamic = "force-dynamic"`. `/`'s metadata is
already request-time under D-1.

### D-5 — Stitch reconciliation: repo conventions win on mechanics, Stitch wins on content

| Stitch mock                                                                          | Repo                                                                                | Winner                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary #ffb4a8`, `primary-container #dc0000`                                       | `--primary: #dc0000`                                                                | Repo: Stitch `primary-container` maps to `primary`; `on-surface-variant` to `muted-foreground`; `surface-container-low` to `card`; `surface-container-highest` to `border` |
| Material Symbols (`timer`, `tune`, `notifications_active`, `save`, `play_arrow`)     | `lucide-react`                                                                      | Repo: `Timer`, `SlidersHorizontal`, `BellRing`, `Save`, `Play` at `size-5`                                                                                                 |
| `<button>` CTAs                                                                      | `<Button asChild><Link>` (`not-found.tsx`)                                          | Repo — spec scenarios require link navigation                                                                                                                              |
| Text wordmark "IRON PULSE ■"                                                         | `/logo-iron-pulse.png` via `next/image`                                             | Repo                                                                                                                                                                       |
| Footer: "Privacidad", "Ayuda", "· V1.0"                                              | "Términos de Servicio", "Política de Privacidad", "Contacto", "ELITE COMBAT LEAGUE" | Repo — `app-shell` spec pins this content                                                                                                                                  |
| `fixed` topbar + `pt-[104px]`                                                        | header in flow                                                                      | Repo, plus `sticky top-0 z-50` (one class, no offset math)                                                                                                                 |
| Card 3: "Creá tu cuenta gratuita"                                                    | sign-up is disabled                                                                 | Repo: reword to sign-in with Google                                                                                                                                        |
| Section order, Spanish voseo copy, mono eyebrow/microcopy, `border-l-4` accent cards | —                                                                                   | **Stitch** — voseo matches `not-found.tsx` ("buscás")                                                                                                                      |

Headings use `font-heading uppercase italic` per `not-found.tsx`. Uppercase is **CSS-only**
so accessible names stay "Probar el timer" / "Iniciar sesión" exactly as the specs require.

### D-6 — Component structure (AGENTS.md + `ui-structure` spec)

All five new components are purely presentational: no state, no effects, no ports. Per
`ui-structure` "Presentational Components Are Not Rendered-Tested" they get **no hook and
no test file**. Their behavior is covered by the route tests in D-7, which is the existing
precedent (`src/app/__tests__/page.test.tsx` already renders and asserts links).

```
src/ui/components/
  topbar/          topbar.tsx  topbar.types.ts (TopbarProps { session: Session | null })  index.ts
  footer/          footer.tsx  index.ts                    # no props -> no .types.ts (mirrors login-footer)
  landing-hero/    landing-hero.tsx  index.ts
  landing-benefits/landing-benefits.tsx  index.ts          # 3 items from a local const array
  landing-cta/     landing-cta.tsx  index.ts
```

### D-7 — `login-header` / `login-footer` migration

Deleted outright, not renamed: `Topbar` has different props and session logic, `Footer`
carries `login-footer.tsx`'s markup verbatim. Only `src/app/login/page.tsx` and the two
barrels import them, and neither has a test — a clean cut. `/login` keeps `LoginCard` and
`SecurityBadges` untouched; the only OAuth-flow change anywhere is D-1c's one-line redirect
target.

## Data Flow

    /  (Server Component, force-dynamic)
        └─ getCurrentSession({ session: createCookieSessionAdapter() })()
               └─ Session | null ──→ <Topbar session={...} />   (presentational)
                                        ├─ null    → "Iniciar sesión" → /login  +  disabled "Registrarse"
                                        └─ Session → /profile, /timers, <form action="/api/logout">

    /login  (Server Component, force-dynamic)
        └─ getCurrentSession(...)()
               ├─ Session → redirect("/timers")          # never renders
               └─ null    → <Topbar session={null} />    # logged-out variant, unconditional

Landing body (`LandingHero` → `LandingBenefits` → `LandingCta`) receives **no** session and
renders identically in both states, satisfying `landing-page`'s session-agnostic requirement.
If the adapter fails closed, `session` is `null` and only the Topbar changes.

## File Changes

| File                                                                             | Action  | Description                                                                                   |
| -------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `src/ui/components/topbar/{topbar.tsx,topbar.types.ts,index.ts}`                 | Create  | Session-aware presentational topbar                                                           |
| `src/ui/components/footer/{footer.tsx,index.ts}`                                 | Create  | Shared footer, content from `login-footer`                                                    |
| `src/ui/components/login-header/`, `.../login-footer/`                           | Delete  | Superseded by the shared shell                                                                |
| `src/app/login/page.tsx`                                                         | Modify  | Session read + `redirect("/timers")` guard, `force-dynamic`, shell imports (`session={null}`) |
| `src/app/login/__tests__/page.test.tsx`                                          | Create  | Proves the guard and the logged-out shared shell                                              |
| `src/infraestructure/actions/google-login/google-login.action.ts`                | Modify  | Line 44: `redirect("/")` → `redirect("/timers")`                                              |
| `src/infraestructure/actions/google-login/__tests__/google-login.action.test.ts` | Modify  | Line 78 assertion + line 59 title retargeted to `/timers`                                     |
| `src/ui/components/landing-{hero,benefits,cta}/`                                 | Create  | Marketing sections                                                                            |
| `src/app/page.tsx`                                                               | Modify  | Drops `redirect()` and the authenticated body; composition root + `metadata`                  |
| `src/app/__tests__/page.test.tsx`                                                | Rewrite | Redirect/greeting assertions replaced                                                         |
| `src/infraestructure/config/site-url.ts` + `__tests__/`                          | Create  | `siteUrl()` with documented fallback                                                          |
| `src/app/layout.tsx`                                                             | Modify  | Documents why it deliberately carries no `metadataBase` (see D-4)                             |
| `src/app/{robots.ts,sitemap.ts}` + `src/app/__tests__/{robots,sitemap}.test.ts`  | Create  | Typed `MetadataRoute.*`, `force-dynamic`                                                      |
| `.env.example`                                                                   | Modify  | Documents `SITE_URL`                                                                          |

## Testing Strategy (strict TDD — RED first)

| Unit                             | RED test                                                                                                                                                                                                                                                                                    | Notes                                                                                                                                                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `siteUrl()`                      | returns `SITE_URL`; falls back to `http://localhost:3000` when unset                                                                                                                                                                                                                        | Real branch; `vi.stubEnv`                                                                                                                                                                                                                         |
| `/` route                        | renders the landing with **no** redirect when session is `null`; renders the same body when a session exists; "Probar el timer" → `/guest-timer`; "Iniciar sesión" → `/login`; exactly three benefit items; logged-in topbar shows `/profile`, `/timers`, logout                            | Rewrite of `src/app/__tests__/page.test.tsx`. Drop the `next/navigation` mock — successful render **is** the no-redirect proof. Keep the `getCurrentSession` / `createCookieSessionAdapter` mocks and the `// @vitest-environment jsdom` docblock |
| `/login` route                   | redirects to `/timers` when a session exists; renders the logged-out shared Topbar, `LoginCard`, and shared Footer when it does not                                                                                                                                                         | New file. Guard test mirrors the `next/navigation` mock style of the current `src/app/__tests__/page.test.tsx` (throw `NEXT_REDIRECT`, assert `rejects.toThrow`), which the rewritten `/` test drops                                              |
| `googleLogin` action             | **existing test amended, not added**: `google-login.action.test.ts:78` `expect(redirectMock).toHaveBeenCalledWith("/")` becomes `"/timers"`, and the title at line 59 ("…redirects to / on success") is retargeted. The three failure-path tests (`redirectMock` not called) are unaffected | Only assertion in the repo pinning the post-login destination — grep confirms no other `"/"` redirect assertion                                                                                                                                   |
| `sitemap()`                      | exactly `/`, `/login`, `/guest-timer`; `/guest-timer-active` absent; URLs built from `siteUrl()`                                                                                                                                                                                            | node env                                                                                                                                                                                                                                          |
| `robots()`                       | allows the public routes and references `${siteUrl()}/sitemap.xml`                                                                                                                                                                                                                          | node env                                                                                                                                                                                                                                          |
| Topbar, Footer, landing sections | none                                                                                                                                                                                                                                                                                        | Presentational — forbidden by `ui-structure`; covered by the route tests above                                                                                                                                                                    |

## Threat Matrix

**N/A** — no shell command, subprocess, VCS/PR automation, executable-file classification,
or process-integration boundary. All matrix rows are git/shell/PR-argument concerns; this
change only alters Next.js in-app page routing.

## Migration / Rollout

No data, cookie, storage-key, or backend-contract change; rollback is a pure code revert.
Slices confirmed, dependency order is strictly linear:

1. **PR1 — shell + authenticated-visitor routing** (~185–255 lines, was ~150–220): `topbar/`,
   `footer/`, `/login` rewiring, the D-1b guard + its new route test, the D-1c one-line
   `googleLogin` change + its amended assertion, `login-header`/`login-footer` deleted.
   D-1b and D-1c are one behavior ("authenticated users are never on the public sign-in
   surface"), and PR1 already touches `/login` — keeping them together also avoids a window
   where `/` is marketing but sign-in still lands there. Independently shippable.
2. **PR2 — landing** (~180–330, unchanged): landing sections, `/` rehoming,
   `page.test.tsx` rewrite. Depends on PR1 (imports `Topbar`/`Footer`).
3. **PR3 — SEO** (~40–80, unchanged): `siteUrl()`, `metadataBase`, page `metadata`,
   `robots.ts`, `sitemap.ts`, `.env.example`. Depends on PR2 only for `/`'s `metadata` export.

Revised total ~405–665 lines (was ~420–700 — the guard and redirect add ~35, offset by
`/login` no longer threading a session prop). Still over budget; slicing is unchanged.
PR1 targets the feature branch; PR2 targets PR1; PR3 targets PR2.
`400-line budget risk: High` · `Chained PRs recommended: Yes` · `Decision needed before apply: Yes`.

## Open Questions

- [x] ~~Post-login destination~~ — **resolved**: binding decision D-1c, `redirect("/timers")`,
      in scope, PR1.
- [ ] `Topbar` renders `next/image`; no existing test renders `next/image` under jsdom. If
      the route tests trip on it, add a local `next/image` mock rather than changing the
      component.
- [ ] The Footer's brand line stays "ELITE COMBAT LEAGUE" per `app-shell`, while the Stitch
      mock leads with "IRON PULSE". Product may want to reconcile brand naming separately.
