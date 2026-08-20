# Apply Progress: Public Landing Page & Shared App Shell

## Run 1 — PR1 (Phase 0 + Phase 1)

Scope: shared shell (`Topbar`/`Footer`) + D-1b `/login` authenticated-visitor
guard + D-1c post-login redirect change, per the orchestrator's PR1-only
scope for this run. PR2 (landing composition, `/` rehoming) and PR3 (SEO)
were explicitly out of scope and were not started.

### Completed tasks

- [x] 0.1 — Confirmed `specs/login-page/spec.md` already carries the D-1b
      guard requirement and the corrected logged-out-only "Login Header" clause.
      No edit needed.
- [x] 1.1 — Created `src/ui/components/topbar/{topbar.tsx,topbar.types.ts,index.ts}`.
      Presentational, zero client JS, `sticky top-0 z-50` (D-5). Logged-out:
      sign-in link → `/login`, disabled "Registrarse". Logged-in: `/profile`,
      `/timers`, `<form action="/api/logout" method="post">`.
- [x] 1.2 — Created `src/ui/components/footer/{footer.tsx,index.ts}`. Content
      ported verbatim from the retired `login-footer.tsx`. No props, no test.
- [x] 1.3 — RED: wrote `src/app/login/__tests__/page.test.tsx` (5 tests:
      redirect-to-`/timers` on session, logged-out Topbar link/href, absence of
      logged-in Topbar links, `LoginCard` render, shared `Footer` render).
      Confirmed 2 of 5 failed against the pre-change page (redirect not thrown;
      Topbar href still `#` from the old `LoginHeader`) before touching
      `page.tsx`.
- [x] 1.4 — GREEN: rewrote `src/app/login/page.tsx` — `getCurrentSession()` +
      `redirect("/timers")` guard, `export const dynamic = "force-dynamic"`,
      swapped `LoginHeader`/`LoginFooter` for `Topbar session={null}` / `Footer`.
      All 5 tests pass.
- [x] 1.5 — RED: retargeted `google-login.action.test.ts`'s success-path title
      and `redirectMock` assertion from `/` to `/timers`. Confirmed failure
      (action still redirected to `/`) before editing the action.
- [x] 1.6 — GREEN: `google-login.action.ts:44` `redirect("/")` →
      `redirect("/timers")` (doc comment above it updated to match).
- [x] 1.7 — Deleted `src/ui/components/login-header/` and
      `src/ui/components/login-footer/` (only `/login` imported them, no test
      files existed for either).
- [x] 1.8 — Verified PR1 boundary green (see Verification below).

### Deviations from design/tasks

None. `next/image` inside `Topbar` did not trip jsdom in the route test (the
design's open question flagged this as a risk) — no local mock was needed.
`Topbar`'s `index.ts` exports only the component (matches the existing
`login-card`/`security-badges` barrel convention; `TopbarProps` stays an
internal type, not re-exported).

### Verification (this run)

```
npm run lint       # 0 errors, 16 pre-existing warnings (unrelated files)
npx tsc --noEmit    # clean, no output
npm run test        # 51 files, 298 tests passed
```

### Remaining for PR2 (not started)

- `landing-hero/`, `landing-benefits/`, `landing-cta/` components.
- Rewrite `src/app/page.tsx` to drop `redirect()`, compose the landing body,
  render session-aware `Topbar`.
- Rewrite `src/app/__tests__/page.test.tsx` (drop the `next/navigation` mock).
- Depends on this PR1 branch (`Topbar`/`Footer`).

### Remaining for PR3 (not started)

- `siteUrl()` infra helper + test.
- `metadataBase` on `layout.tsx`, page `metadata` on `src/app/page.tsx`.
- `robots.ts` / `sitemap.ts` + tests.
- `.env.example` — document `SITE_URL`.
- Depends on PR2 for `/`'s `metadata` export.

## Run 2 — PR2 (Phase 2)

Scope: landing composition + `/` rehoming only, per the orchestrator's PR2-only
scope for this run. PR3 (SEO) explicitly out of scope, not started.

### Completed tasks

- [x] 2.1 — Created `src/ui/components/landing-hero/{landing-hero.tsx,index.ts}`.
      Eyebrow + `font-heading uppercase italic` H1 + copy + primary CTA
      (`Button` default variant, `Timer` icon, `/guest-timer`) + secondary CTA
      (`Button` outline variant, `/login`) + microcopy. Primary CTA is first in
      DOM order and uses the filled/default button variant vs. the secondary's
      `outline` variant — visual + structural priority per spec. Presentational,
      no test.
- [x] 2.2 — Created `src/ui/components/landing-benefits/{landing-benefits.tsx,index.ts}`.
      Local `BENEFITS` const array, exactly 3 items (`SlidersHorizontal`,
      `BellRing`, `Save` icons), `border-l-4` accent cards matching
      `timer-configuration-card`'s existing pattern. Card 3 copy reworded per
      D-5 from "create a free account" to "sign in with Google" (sign-up stays
      disabled). Presentational, no test.
- [x] 2.3 — Created `src/ui/components/landing-cta/{landing-cta.tsx,index.ts}`.
      Closing CTA section, single button (`Play` icon) → `/guest-timer`, matches
      the Stitch mock's single-CTA cierre section. Presentational, no test.
- [x] 2.4 — RED: rewrote `src/app/__tests__/page.test.tsx` — dropped the
      `next/navigation` mock entirely (7 tests): hero heading renders with no
      session; identical `<main>` innerHTML across logged-out/logged-in renders
      (byte-for-byte body proof, stronger than the design's suggested assertion
      list); primary/secondary CTA hrefs; exactly
      3 benefit items; logged-in Topbar shows `/timers`; logged-in Topbar hides
      "Iniciar Sesión". Confirmed 5 of 7 failed against the pre-change page
      (`NEXT_REDIRECT` thrown) before touching `page.tsx` — the other 2 passed
      incidentally since the old authenticated body also rendered a `/timers`
      link and no sign-in link.
- [x] 2.5 — GREEN: rewrote `src/app/page.tsx` — dropped `redirect()` and the
      old authenticated greeting/links/logout body; kept `force-dynamic` (same
      fail-closed-before-`cookies()` rationale as `/login`); reads session
      once, passes to `Topbar`; composes
      `LandingHero → LandingBenefits → LandingCta` inside the page's `<main>`
      (session-agnostic) + shared `Footer`. All 7 tests pass.
- [x] 2.6 — Not needed: `Topbar`'s `next/image` did not trip jsdom in the
      route test, same result as PR1's `/login` test — no local mock added.
- [x] 2.7 — Verified PR2 boundary green (see Verification below).

### Deviations from design/tasks

- Spacing: the Stitch mock's `tailwind.config` defines custom named spacing
  tokens (`lg`/`xl`/`sm`/`md`/`base`/`gutter`/`margin-*`). This repo has none —
  `globals.css` only has color/radius/font tokens in `@theme inline {}`.
  Translated all mock spacing to the repo's standard numeric Tailwind scale
  (`gap-6`, `px-4`, `py-10`, etc.) instead of inventing new tokens, per the
  run's "no new tokens" instruction.
- Route test: used `<main>` `innerHTML` equality between a logged-out and a
  logged-in render, rather than only the design's suggested "identical body
  markup" assertion list. This gives a byte-for-byte proof of the
  `landing-page` spec's "Landing Body Is Session-Agnostic" requirement instead
  of relying on the absence of a few spot-checked strings. An earlier draft
  reached the body through a `data-testid`; that was dropped, since `<main>`
  already carries an implicit role and production markup should not grow
  attributes that exist only for tests.
- `LandingCta`'s button also reads "Probar el timer" (same label as the hero's
  primary CTA, per the Stitch mock's cierre section) — the route test's
  `getAllByRole(...)[0]` picks the hero instance (first in DOM order) for the
  href assertion, so both instances coexist without ambiguity.

### Verification (this run)

```
npm run lint          # 0 errors, 16 pre-existing warnings (unrelated files)
npx tsc --noEmit       # clean, no output
npm run test           # 51 files, 302 tests passed
npx prettier --check   # all matched files use Prettier code style
```

### Remaining for PR3 (not started)

- `siteUrl()` infra helper + test.
- `metadataBase` on `layout.tsx`, page `metadata` on `src/app/page.tsx`.
- `robots.ts` / `sitemap.ts` + tests.
- `.env.example` — document `SITE_URL`.
- Depends on PR2 (this run) for `/`'s `metadata` export — PR2 is now complete,
  so PR3 is unblocked for the next run.
