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
      session; identical `data-testid="landing-body"` innerHTML across
      logged-out/logged-in renders (byte-for-byte body proof, stronger than the
      design's suggested assertion list); primary/secondary CTA hrefs; exactly
      3 benefit items; logged-in Topbar shows `/timers`; logged-in Topbar hides
      "Iniciar Sesión". Confirmed 5 of 7 failed against the pre-change page
      (`NEXT_REDIRECT` thrown) before touching `page.tsx` — the other 2 passed
      incidentally since the old authenticated body also rendered a `/timers`
      link and no sign-in link.
- [x] 2.5 — GREEN: rewrote `src/app/page.tsx` — dropped `redirect()` and the
      old authenticated greeting/links/logout body; kept `force-dynamic` (same
      fail-closed-before-`cookies()` rationale as `/login`); reads session
      once, passes to `Topbar`; composes
      `LandingHero → LandingBenefits → LandingCta` inside a
      `data-testid="landing-body"` wrapper (session-agnostic) + shared
      `Footer`. All 7 tests pass.
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
- Route test: used one `data-testid="landing-body"` wrapper + `innerHTML`
  equality between a logged-out and logged-in render, rather than only the
  design's suggested "identical body markup" assertion list. This gives a
  byte-for-byte proof of the `landing-page` spec's "Landing Body Is
  Session-Agnostic" requirement instead of relying on the absence of a few
  spot-checked strings.
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

## Run 3 — PR3 (Phase 3) + two carried-over test corrections

Scope: SEO surface only, per the orchestrator's PR3-only scope for this run,
plus two non-blocking test-quality findings carried over from PR2's bounded
review against `src/app/__tests__/page.test.tsx`.

### Completed tasks

- [x] 3.1 — RED: wrote `src/infraestructure/config/__tests__/site-url.test.ts`
      (2 tests: returns `SITE_URL` when set; falls back to
      `http://localhost:3000` when unset via `vi.stubEnv("SITE_URL", undefined)`
      — `undefined` deletes the stubbed var per vitest's `VitestUtils.stubEnv`
      type, verified in `node_modules/vitest/dist/index.d.ts`). Confirmed both
      failed (`Cannot find module '../site-url'`) before creating the module.
- [x] 3.2 — GREEN: created `src/infraestructure/config/site-url.ts` —
      `siteUrl(): string` returning `process.env.SITE_URL || "http://localhost:3000"`
      (`||`, not `??`, so an empty-string env value also falls back). Both
      tests pass.
- [x] 3.3 — Modified `src/app/layout.tsx` — imports `siteUrl` from
      `@/infraestructure/config/site-url`, adds
      `metadataBase: new URL(siteUrl())` to the root `metadata` export.
- [x] 3.4 — Modified `src/app/page.tsx` — added a page-level `metadata`
      export (`title`, Spanish `description`, `openGraph`, `twitter`, OG/
      Twitter image `/logo-iron-pulse.png`, the only image asset in
      `public/`). Static declarative object, no branch/loop — no RED test,
      matches the design's testing table.
- [x] 3.5 — RED: wrote `src/app/__tests__/robots.test.ts` (2 tests: allows
      `/`, `/login`, `/guest-timer`; `sitemap` field is
      `${siteUrl()}/sitemap.xml`). Confirmed both failed
      (`Cannot find module '../robots'`) before creating the module.
- [x] 3.6 — GREEN: created `src/app/robots.ts` — typed
      `MetadataRoute.Robots`, `export const dynamic = "force-dynamic"`.
      Verified the caching gotcha against
      `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/robots.md`
      before implementing: "`robots.js` is a special Route Handler that is
      cached by default unless it uses a Request-time API or dynamic config
      option." Both tests pass.
- [x] 3.7 — RED: wrote `src/app/__tests__/sitemap.test.ts` (2 tests: exactly
      `/`, `/login`, `/guest-timer` in that order; `/guest-timer-active`
      absent). Confirmed both failed (`Cannot find module '../sitemap'`)
      before creating the module.
- [x] 3.8 — GREEN: created `src/app/sitemap.ts` — typed
      `MetadataRoute.Sitemap`, `export const dynamic = "force-dynamic"`.
      Same gotcha verified against the sitemap doc counterpart
      (`.../01-metadata/sitemap.md`, identical wording). Both tests pass.
- [ ] 3.9 — **BLOCKED, not completed.** `.env.example` is hard-denied by this
      sandbox's permission settings for Read, Write, and Bash (`cat`) alike —
      confirmed with three independent attempts, all returning "File is in a
      directory that is denied by your permission settings." Separately (not
      the blocker, but worth flagging): `git log --all` shows `.env.example`
      has **never been committed** on any local or remote branch, and
      `git check-ignore -v .env.example` resolves to `.gitignore:37:.env*` —
      the pattern `.env*` (with only `!.env.local.example` carved out) also
      currently ignores `.env.example` itself, contradicting AGENTS.md's
      "`.env.example` is the committed template; keep it updated" (Security
      section). Both issues need a session with different sandbox
      permissions and, separately, a `.gitignore` fix (`!.env.example`) that
      is out of this run's scope to make unprompted.
- [x] 3.10 — Verified PR3 boundary green (see Verification below), including
      `npm run build` (the DoD-mandated check for `metadataBase` and Route
      Handler compilation) plus a manual `npm run build && npm run start` + `curl /robots.txt /sitemap.xml` runtime check — both routes render
      `ƒ (Dynamic)` in the build's route table (not prerendered/cached) and
      the fallback `http://localhost:3000` resolves correctly at runtime
      (no `SITE_URL` set in this environment's `.env`), proving the
      `force-dynamic` gotcha fix actually works end-to-end, not just at the
      unit-test level.

### Carried-over test corrections (also this run)

Both applied to `src/app/__tests__/page.test.tsx`:

1. `"should render exactly three benefit items"` previously only asserted
   the three known titles were present via three separate `getByText`
   calls — never a count, so a fourth benefit would still pass. Replaced
   with `screen.getAllByRole("heading", { level: 3 })` mapped to
   `textContent` and compared via `toEqual` against the exact 3-element
   array of expected titles in order — proves both the count (array-length
   mismatch fails `toEqual`) and the identity/order in one assertion,
   stronger than either the original or a bare `toHaveLength(3)`.
2. Primary/secondary CTA tests replaced `getAllByRole(...)[0]` (DOM-order-
   dependent, only safe because the hero and `LandingCta` share the
   "Probar el timer" label/href) with `within(...)` scoped to the hero
   `<section>` (found via `.closest("section")` from the H1 heading), then
   an unscoped `getByRole` inside that scope — now identifies the hero's
   CTA specifically, not "whichever renders first". `"Iniciar sesión"` is
   unique today, but the pattern stays defensive and symmetric with the
   primary-CTA fix.

### Deviations from design/tasks

- Task 3.9 not completed — see the BLOCKED note above. This is a sandbox
  permission limitation in this run, not a design or scope decision.
- `siteUrl()` uses `||` rather than `??` against `process.env.SITE_URL` so
  an accidentally-set empty-string env value also falls back to the
  placeholder, matching the spec's "unset falls back" scenario in spirit
  (an empty string is not a usable origin either). Not explicitly specified
  by the design, judged the safer reading of "unset."
- `robots.ts`'s `allow` field is an explicit 3-element array
  (`["/", "/login", "/guest-timer"]`) rather than a single `"/"` wildcard —
  matches the spec's literal "allows crawling of the public routes (`/`,
  `/login`, `/guest-timer`)" wording precisely instead of the broader
  `Allow: /` the Stitch/docs examples show.
- Landing `metadata`'s OG/Twitter image reuses `/logo-iron-pulse.png`
  (the only image asset in `public/`) rather than a dedicated 1200×630 OG
  asset — no such asset exists in the repo and generating one is outside
  this run's scope (no new dependency, no design-asset pipeline).

### Verification (this run)

```
npm run lint          # 0 errors, 16 pre-existing warnings (unrelated files)
npx tsc --noEmit       # clean, no output
npm run test           # 54 files, 308 tests passed (302 + 6 new: site-url x2, robots x2, sitemap x2)
npm run build          # succeeds; route table shows `/robots.txt` and `/sitemap.xml` as ƒ (Dynamic)
npm run build && npm run start + curl   # /robots.txt and /sitemap.xml resolve correctly at runtime,
                                          # SITE_URL fallback (localhost:3000) confirmed live, no
                                          # /guest-timer-active entry in the sitemap
```

### Remaining

- Task 3.9 (`.env.example`) — needs a differently-scoped session; the change
  itself is a one-line addition (`SITE_URL=http://localhost:3000`) once
  permission/`.gitignore` access is available.
- PR1, PR2, PR3 are otherwise all complete. This was the final planned slice
  per `tasks.md`'s work-unit table.
