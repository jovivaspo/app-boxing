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
