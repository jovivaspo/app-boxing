# Proposal: Public Landing Page & Shared App Shell

Issue: #46 — Create landing & subcomponents
Depends on: `openspec/changes/issue-46-landing-page/exploration.md`

## Intent

Iron Pulse has no public entry point. `/` is session-gated and redirects anonymous
visitors straight to `/login`, so a first-time visitor is asked to authenticate before
learning what the product does, and there is nothing indexable or shareable to link to.

`/` becomes a public marketing landing for everyone (binding user decision D1 — no
session-based redirect). Session-aware navigation moves into a shared topbar
(D2 — exploration §7 Option 3), so the landing body is identical for guests and
authenticated users. Google OAuth sign-in is unchanged: the topbar's sign-in
affordance links to `/login`, which keeps owning the whole OAuth flow.

Success: an anonymous visitor lands on `/`, understands the product, and can reach
`/login`; an authenticated visitor sees the same body plus app links and logout in the
topbar; `/` is crawlable and shareable with OG/Twitter metadata.

## Scope

### In Scope

- Public landing at `src/app/page.tsx`: hero + marketing sections, Spanish copy, existing
  dark tokens (`font-heading uppercase`, `border-l-4 border-l-primary`, `--radius: 0px`).
- Shared session-aware `Topbar` and shared `Footer` under `src/ui/components/`,
  generalized from `login-header` / `login-footer` without regressing `/login`.
- Removal of the `/` redirect and of the authenticated home body (greeting, `/profile`,
  `/timers`, logout form); those links live in the topbar from now on.
- SEO: `metadataBase` in `layout.tsx`, page `metadata` with `openGraph`/`twitter` on `/`,
  `app/robots.ts`, `app/sitemap.ts`.
- Rewrite of `src/app/__tests__/page.test.tsx` (redirect/greeting assertions are gone).

### Out of Scope

- Enabling `cacheComponents` / PPR in `next.config.ts` — separate infra decision.
- Light mode, `--radius` changes, or any new design token.
- Registration / sign-up (`login-header`'s disabled "Registrarse" `<span>` stays disabled).
- Any change to the Google OAuth flow, session adapter, or `/login` behaviour.
- A separate `/home` dashboard route (exploration §7 Option 2, rejected).

## Capabilities

### New Capabilities

- `landing-page`: public `/` route, sections, copy, CTA targets, SEO metadata surface.
- `app-shell`: shared session-aware `Topbar` + `Footer` used by `/` and `/login`.

### Modified Capabilities

- `login-page`: "Root path redirect" requirement (`/` → `/login`) is REMOVED; "Login
  Header" / "Login Footer" requirements are re-expressed against the shared shell.

## Approach

1. **PR1 — shell.** Build `topbar/` and `footer/` (kebab folders, `.tsx` + `.types.ts`
   - `index.ts`; hook only if the mobile menu needs state, tested per `ui-structure`).
     `Topbar` takes `session: Session | null` as a prop — dumb presentational, no new
     AGENTS.md exception. Rewire `/login` to them; delete `login-header`/`login-footer`.
2. **PR2 — landing.** `src/app/page.tsx` drops `redirect()` and the authenticated body,
   calls `getCurrentSession()` once at the composition root, passes the session to
   `Topbar`, and renders marketing sections. Rewrite its route test.
3. **PR3 — SEO.** `metadataBase`, page `metadata` (`openGraph`/`twitter`), `robots.ts`,
   `sitemap.ts` as typed `MetadataRoute.*`.

## Open Design Question (for `sdd-design`)

**How does the topbar read the session on `/`?** After D2 the landing body no longer
depends on auth state, so the topbar's session read is the _only_ thing forcing `/`
dynamic. Exploration §1: this repo has no Cache Components/PPR, so any `cookies()` read
in the RSC tree bails the whole route to dynamic — a `Suspense` boundary buys no static
shell here.

| Option                                                           | Gain                                          | Cost                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **A. Server prop from composition root** (exploration §3 path 1) | No flash, no hydration risk, no new exception | `/` stays `force-dynamic`; no edge/CDN caching of the shell                                                 |
| **B. Client hook + Server Action** (AGENTS.md exception 1 + A2)  | `/` can render statically                     | Flash-of-unauthenticated-content in the topbar; repeats the pattern that caused the issue #44 hydration bug |

**Recommendation: A.** `output: "standalone"` with no CDN in the repo means the static-`/`
win is latency-only, not indexability (SSR HTML is fully crawlable), while B's cost is a
visible UX defect on a marketing page plus a known-bad precedent. `sdd-design` should
confirm or overturn this explicitly rather than inherit it silently.

## Affected Areas

| Area                                                   | Impact                | Description                                                                                 |
| ------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------- |
| `src/app/page.tsx`                                     | Modified              | Loses `redirect("/login")` and the authenticated body; becomes the landing composition root |
| `src/app/__tests__/page.test.tsx`                      | Modified              | Redirect + greeting assertions removed and replaced                                         |
| `src/app/layout.tsx`                                   | Modified              | Adds `metadataBase`                                                                         |
| `src/app/login/page.tsx`                               | Modified              | Consumes shared `Topbar`/`Footer` instead of `login-header`/`login-footer`                  |
| `src/ui/components/login-header/`, `.../login-footer/` | Removed               | Generalized into the shared shell                                                           |
| `src/ui/components/topbar/`, `.../footer/`             | New                   | Shared session-aware shell                                                                  |
| `src/app/robots.ts`, `src/app/sitemap.ts`              | New                   | SEO routes                                                                                  |
| `openspec/specs/login-page/spec.md`                    | Modified (at archive) | Root-redirect requirement removed                                                           |

## Risks

| Risk                                                         | Likelihood | Mitigation                                                                                                                            |
| ------------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Stitch has no landing screen (project `6380251267090136078`) | Certain    | **Prerequisite**: generate a landing screen (topbar/footer/sections) in Stitch before `sdd-design`. Blocks design, not this proposal. |
| Regressing `/login` while generalizing header/footer         | Medium     | PR1 rewires and verifies `/login` before any landing work lands                                                                       |
| Size: ~420–700 changed lines vs 400-line budget              | High       | 3 chained PRs (see Delivery Forecast)                                                                                                 |
| Stitch mock assumes light mode / rounded corners             | Medium     | Reconcile against the single dark palette before `sdd-design`                                                                         |
| Removing the greeting loses personalization                  | Low        | Accepted under D2; topbar carries the authenticated affordances                                                                       |

## Rollback Plan

`rules.proposal` requires this because `/` currently sits on the auth-gated surface.

- Rollback is a pure code revert — no data, storage-key, session-cookie, or backend
  contract is touched, and the session adapter / OAuth flow are unmodified.
- Reverting PR2 alone restores the `force-dynamic` session gate and the `/login`
  redirect on `/`; PR1 and PR3 are independently revertible and harmless on their own
  (shared shell unused, SEO files inert).
- If only the shell regresses `/login`, revert PR1 and `git restore` `login-header`/
  `login-footer` from history; the landing can render without a topbar in the interim.
- No authenticated user loses access at any point: `/profile`, `/timers`, and
  `/api/logout` keep working regardless of what `/` renders.

## Delivery Forecast

Exploration §8 estimated ~470–770 lines. D2 removes the auth-branching CTA block from
the landing slice (roughly −50 lines), leaving **~420–700 lines — still over the
400-line budget**.

- `400-line budget risk: High`
- `Chained PRs recommended: Yes`
- `Decision needed before apply: Yes` (delivery strategy is `ask-on-risk`)

Slices: **PR1** shell (~150–220) → **PR2** landing + `/` rehoming (~180–330) →
**PR3** SEO (~40–80). PR1 targets the feature branch; PR2 targets PR1; PR3 targets PR2.

## Dependencies

- **Blocking `sdd-design`**: a Stitch landing screen must exist in project
  `6380251267090136078` (no landing screen today).
- Non-blocking: none. No new npm dependency, no config change.

## Success Criteria

- [ ] An anonymous visitor at `/` sees the landing, not a redirect to `/login`.
- [ ] An authenticated visitor at `/` sees the same landing body; the topbar shows
      `/profile`, `/timers`, and logout.
- [ ] The topbar's sign-in affordance reaches `/login`, whose Google OAuth flow is
      unchanged and still succeeds end-to-end.
- [ ] `/login` renders header/footer via the shared shell with no visual or behavioural
      regression.
- [ ] `/` returns crawlable HTML with `title`, `description`, `openGraph`, and `twitter`
      metadata; `/robots.txt` and `/sitemap.xml` resolve.
- [ ] New user-facing copy is Spanish, consistent with existing app copy.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test`, and `npm run build` pass.

## Proposal Question Round

Answer, correct, skip, or ask for a second round — these shape the PRD, not the harness.

1. **Marketing content**: what are the landing's sections and the single primary CTA?
   Assumed: hero (product promise + "Probar el timer" → `/guest-timer` and "Iniciar
   sesión" → `/login`), a 3-item feature/benefit block, a closing CTA. Confirm or replace.
2. **Guest timer prominence**: should the landing push the no-signup guest timer as the
   primary CTA (lower friction, may cannibalize signups) or push sign-in first?
   Assumed: guest timer is the primary CTA, sign-in secondary.
3. **Authenticated visitors**: confirmed they get _no_ shortcut in the landing body —
   only the topbar links? Assumed yes per D2; flagging because it costs an authenticated
   user one extra click versus today.
4. **Public URL**: what is the canonical production origin for `metadataBase`, `sitemap`
   entries, and OG image URLs? Assumed unknown → will be read from an env var with a
   placeholder default until provided.
5. **Sitemap surface**: should `sitemap.ts` list only `/` and `/login`, or also the
   public guest routes (`/guest-timer`, `/guest-timer-active`)? Assumed `/`, `/login`,
   and `/guest-timer`; `/guest-timer-active` excluded (requires local state).
