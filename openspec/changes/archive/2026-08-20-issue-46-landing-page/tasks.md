# Tasks: Public Landing Page & Shared App Shell

## Review Workload Forecast

| Field                   | Value                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Estimated changed lines | ~405–665 (PR1 ~185–255, PR2 ~180–330, PR3 ~40–80)                                |
| 400-line budget risk    | High                                                                             |
| Chained PRs recommended | Yes                                                                              |
| Suggested split         | PR1 (shell + auth routing) → PR2 (landing) → PR3 (SEO)                           |
| Delivery strategy       | ask-on-risk                                                                      |
| Chain strategy          | feature-branch-chain (locked by design.md: PR1→feature branch, PR2→PR1, PR3→PR2) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                                  | PR  | Focused test command                              | Runtime harness                                                     | Rollback boundary                                                                                         |
| ---- | --------------------------------------------------------------------- | --- | ------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1    | Shared Topbar/Footer + `/login` guard + `/timers` post-login redirect | PR1 | `npm run test -- login google-login`              | `npm run dev`, visit `/login` logged-in/out                         | Revert `topbar/`, `footer/`, `/login` page, `google-login.action.ts` + its test; delete none pre-existing |
| 2    | `/` rehomed to public landing, session-agnostic body                  | PR2 | `npm run test -- src/app/__tests__/page.test.tsx` | `npm run dev`, visit `/` logged-in/out                              | Revert `landing-*` components + `page.tsx`/`page.test.tsx`; PR1 stays intact                              |
| 3    | `siteUrl()`, `metadataBase`, `robots.ts`, `sitemap.ts`                | PR3 | `npm run test -- site-url robots sitemap`         | `npm run build && npm run start`, curl `/robots.txt` `/sitemap.xml` | Revert `site-url.ts`, `page.tsx` metadataBase, `robots.ts`, `sitemap.ts`, `.env.example`                  |

## Phase 0: Spec Verification

- [x] 0.1 Confirm `specs/login-page/spec.md` already contains the D-1b guard requirement ("Authenticated Visitors Are Redirected Away From `/login`") and the corrected logged-out-only "Login Header" clause — verified current on disk, no edit needed.

## Phase 1 (PR1): Shared Shell + Authenticated-Visitor Routing

- [x] 1.1 Create `src/ui/components/topbar/{topbar.tsx,topbar.types.ts,index.ts}` — presentational, `TopbarProps { session: Session | null }`, logged-out (sign-in → `/login`, disabled "Registrarse") vs logged-in (`/profile`, `/timers`, `<form action="/api/logout" method="post">`) variants. No test file (presentational, per `ui-structure`).
- [x] 1.2 Create `src/ui/components/footer/{footer.tsx,index.ts}` — content ported verbatim from `login-footer.tsx`. No props, no `.types.ts`, no test file.
- [x] 1.3 RED: write `src/app/login/__tests__/page.test.tsx` — session exists → `redirect("/timers")` (throw `NEXT_REDIRECT`, `rejects.toThrow`); no session → renders shared Topbar (logged-out), `LoginCard`, shared Footer. Mirrors the `next/navigation` mock style dropped from `src/app/__tests__/page.test.tsx`. Expect failure (guard not implemented yet).
- [x] 1.4 GREEN: modify `src/app/login/page.tsx` — add `getCurrentSession()` + guard (`redirect("/timers")` on session), `export const dynamic = "force-dynamic"`, swap `LoginHeader`/`LoginFooter` for `Topbar session={null}` / `Footer`.
- [x] 1.5 RED: amend `src/infraestructure/actions/google-login/__tests__/google-login.action.test.ts` — retarget line 59 title and line 78 `expect(redirectMock).toHaveBeenCalledWith(...)` from `/` to `/timers`. Expect failure (action still redirects to `/`).
- [x] 1.6 GREEN: modify `src/infraestructure/actions/google-login/google-login.action.ts:44` — `redirect("/")` → `redirect("/timers")`.
- [x] 1.7 Delete `src/ui/components/login-header/` and `src/ui/components/login-footer/` (superseded, no test files, only `/login` imported them).
- [x] 1.8 Verify PR1 boundary green: `npm run lint`, `npx tsc --noEmit`, `npm run test`.

## Phase 2 (PR2): Landing Composition + `/` Rehoming

- [x] 2.1 Create `src/ui/components/landing-hero/{landing-hero.tsx,index.ts}` — hero copy, primary CTA "Probar el timer" → `/guest-timer`, secondary "Iniciar sesión" → `/login`, primary visually/structurally prioritized. Presentational, no test.
- [x] 2.2 Create `src/ui/components/landing-benefits/{landing-benefits.tsx,index.ts}` — exactly 3 items from a local const array. Presentational, no test.
- [x] 2.3 Create `src/ui/components/landing-cta/{landing-cta.tsx,index.ts}` — closing CTA reaching `/guest-timer` (and/or `/login`). Presentational, no test.
- [x] 2.4 RED: rewrite `src/app/__tests__/page.test.tsx` — drop the `next/navigation` redirect mock; assert no-redirect render for both session states, identical body markup, CTA hrefs, exactly 3 benefit items, Topbar state (`/profile`/`/timers`/logout when session, sign-in link when not). Keep `getCurrentSession`/`createCookieSessionAdapter` mocks and the `// @vitest-environment jsdom` docblock. Expect failure (old page still redirects).
- [x] 2.5 GREEN: rewrite `src/app/page.tsx` — drop `redirect()` and the authenticated body; keep `force-dynamic`; read session once, pass to `Topbar`; render `LandingHero → LandingBenefits → LandingCta` (session-agnostic) + shared `Footer`.
- [x] 2.6 If jsdom trips on `Topbar`'s `next/image`, add a local `next/image` mock in the route test file rather than changing the component (per design's open question). Not needed — same as PR1, jsdom did not trip.
- [x] 2.7 Verify PR2 boundary green: `npm run lint`, `npx tsc --noEmit`, `npm run test`.

## Phase 3 (PR3): SEO Metadata

- [x] 3.1 RED: write `src/infraestructure/config/__tests__/site-url.test.ts` — returns `SITE_URL` when set; falls back to `http://localhost:3000` when unset, empty, or not a parseable absolute URL (`vi.stubEnv`).
- [x] 3.2 GREEN: create `src/infraestructure/config/site-url.ts` exporting `siteUrl(): string`.
- [x] 3.3 Add `metadataBase: new URL(siteUrl())` to the landing page's `metadata` in
      `src/app/page.tsx`. Superseded the original plan of putting it on `layout.tsx`: the
      layout wraps statically prerendered routes, which would bake the build-time origin.
- [x] 3.4 Modify `src/app/page.tsx` — add page-level `metadata` export: `title`, Spanish `description`, `openGraph`, `twitter`. Static declarative data, no branch/loop — no RED test per design's testing table.
- [x] 3.5 RED: write `src/app/__tests__/robots.test.ts` — allows `/`, `/login`, `/guest-timer`; references `${siteUrl()}/sitemap.xml`.
- [x] 3.6 GREEN: create `src/app/robots.ts` — typed `MetadataRoute.Robots`, `export const dynamic = "force-dynamic"`.
- [x] 3.7 RED: write `src/app/__tests__/sitemap.test.ts` — exactly `/`, `/login`, `/guest-timer`; `/guest-timer-active` absent.
- [x] 3.8 GREEN: create `src/app/sitemap.ts` — typed `MetadataRoute.Sitemap`, `export const dynamic = "force-dynamic"`.
- [ ] 3.9 Modify `.env.example` — document `SITE_URL=http://localhost:3000`. **DEFERRED, closed unfinished** by the repo owner's call on 2026-08-20 ("no es importante por el momento"): `siteUrl()` already falls back to `http://localhost:3000`, so nothing breaks without it. Two independent obstacles remain for whoever picks it up: sandbox permission settings hard-deny Read/Write/Bash access to `.env.example`, and `.gitignore:37`'s `.env*` pattern ignores the file, so it needs a `!.env.example` carve-out before it can be committed at all (see apply-progress.md Run 3 deviations).
- [x] 3.10 Verify PR3 boundary green: `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`.
