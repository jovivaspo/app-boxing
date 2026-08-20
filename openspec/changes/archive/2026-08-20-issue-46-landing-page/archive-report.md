# Archive Report: Issue #46 — Public Landing Page & Shared App Shell

**Change**: `issue-46-landing-page`  
**Date Archived**: 2026-08-20  
**Archived to**: `openspec/changes/archive/2026-08-20-issue-46-landing-page/`  
**Status**: **INTENTIONAL-WITH-WARNINGS** (partial archive, approved by repo owner)

---

## Executive Summary

Issue #46 is complete and archived. Public landing page at `/` launched; shared Topbar/Footer shell added to both `/` and `/login`; SEO metadata surface (`robots.ts`, `sitemap.ts`) delivered; all implementation work verified green. Task 3.9 (`.env.example` documentation) intentionally deferred by repo owner decision — `siteUrl()` already falls back to `http://localhost:3000`, so nothing breaks. Both PRs merged to main and issue closed on GitHub.

---

## Specs Synced

| Domain         | Action      | Details                                                                                                                                                                                                              |
| -------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-shell`    | **Created** | New main spec from delta; shared Topbar + Footer requirements for `/` and `/login`                                                                                                                                   |
| `landing-page` | **Created** | New main spec from delta; public `/` landing route with session-agnostic body                                                                                                                                        |
| `seo-metadata` | **Created** | New main spec from delta; SEO metadata, robots directives, sitemap surface                                                                                                                                           |
| `login-page`   | **Updated** | Merged delta into existing main spec; removed "Root path redirect" requirement; updated "Login Header" and "Login Footer" to describe shared shell; added "Authenticated Visitors Are Redirected Away From `/login`" |

**Merge notes:**

- `login-page` delta modified 3 requirements and added 1. No existing requirements were deleted from main spec (only the "Root path redirect" scenario removed from "Login Page Route"); "Login Card", "Google Sign-In Button", "Security Badges", "Typography and Design Tokens" preserved unchanged.
- Delta spec for `seo-metadata` includes **CRITICAL review fix** from commit `467dd4b` (post-apply): `/guest-timer-active` disallow scenario explicitly present, confirming `robots.ts` requirement to list `/api`, `/profile`, `/timers`, `/guest-timer-active` in the disallow block (not just an allow-only rule).

---

## Archive Contents

All artifacts archived to `openspec/changes/archive/2026-08-20-issue-46-landing-page/`:

```
proposal.md          ✅ Initial proposal with scope, capabilities, risks, rollback plan
exploration.md       ✅ Pre-proposal exploration: architecture decisions, session-read paths
design.md            ✅ Design phase: 7 architecture decisions (D-1 through D-7), file changes, testing strategy
tasks.md             ✅ Phase 0–3 task breakdown; 10 tasks, 9 completed, 1 intentionally deferred
apply-progress.md    ✅ 3 apply runs: PR1 (shell), PR2 (landing), PR3 (SEO); full task completion status, deviations, verification
specs/
  ├── app-shell/spec.md           ✅ Delta spec (source for main spec)
  ├── landing-page/spec.md        ✅ Delta spec (source for main spec)
  ├── login-page/spec.md          ✅ Delta spec (merged into main spec)
  └── seo-metadata/spec.md        ✅ Delta spec (source for main spec)
```

---

## Task Completion & Intentional Partial Archive

**Overall**: 9 of 10 implementation tasks complete. 1 task intentionally left incomplete.

### Completed Tasks (Phase 0–3)

- [x] 0.1 — Spec verification (login-page D-1b guard already present)
- [x] 1.1–1.8 — PR1: Shared shell, `/login` guard, post-login redirect
- [x] 2.1–2.7 — PR2: Landing composition, `/` rehoming
- [x] 3.1–3.8, 3.10 — PR3: SEO surface, metadata, robots, sitemap, build verification

### Incomplete Task (Intentional Deferral)

- [ ] 3.9 — `.env.example` modification

**Reason**: Approved by repo owner on 2026-08-20 per requirement review meeting. Rationale: `siteUrl()` already falls back to `http://localhost:3000`, so `.env.example` is not a blocker for functionality. Two independent barriers prevented completion in this session: sandbox permission settings hard-deny file access to `.env.example`, and `.gitignore:37`'s `.env*` pattern would need a `!.env.example` carve-out before the file could be committed anyway. Both issues are out of scope for this run. One-line change (`SITE_URL=http://localhost:3000`) remains for a future session with appropriate permissions.

**Archive disposition**: Task remains `[ ]` (unchecked) to preserve visibility that work is pending, not lost. Per SKILL.md §Strict-vs-OpenSpec Archive Policy, this is an intentional partial archive with owner approval, recorded here for transparency.

---

## Verification at Close

Verification per `apply-progress.md` Run 3, on main branch after both PRs merged:

```
npm run lint          # 0 errors, 16 pre-existing warnings (unrelated files)
npx tsc --noEmit      # Clean
npm run test          # 54 files, 315 tests passing (302 + 6 new tests for site-url, robots, sitemap)
npm run build         # Success; `/robots.txt` and `/sitemap.xml` marked as ƒ (Dynamic) in route table
npm run format:check  # All matched files use Prettier code style
```

**Runtime verification**: `npm run build && npm run start` + `curl /robots.txt /sitemap.xml` — both routes resolved correctly at runtime with fallback `SITE_URL=http://localhost:3000` (not set in environment), proving `force-dynamic` export gates work end-to-end.

---

## Post-Apply Corrections

After `apply-progress.md` Run 3 was written, the following work completed per GitHub PR reviews:

### Commit `467dd4b` — `fix: disallow the non-public routes in robots.txt`

- **What**: Added `disallow: ["/api", "/profile", "/timers", "/guest-timer-active"]` to `src/app/robots.ts`.
- **Why**: PR #56 bounded review flagged CRITICAL issue: an `allow`-only `robots.ts` is a no-op (in robots.txt, `Allow` only carves exceptions out of `Disallow`; every unlisted route stays crawlable).
- **Evidence**: Requirement scenario added to `seo-metadata` delta spec: "the authenticated app and the API are excluded from crawling" with explicit `/guest-timer-active` disallow note (prefix-match longest-wins rule).
- **Test coverage**: New test scenario covers the `/guest-timer-active` case.

### Commit `a81b142` — `fix: align the sign-in link casing across the topbar and the hero`

- **What**: Unified sign-in CTA from "Iniciar Sesión" (title case in Topbar) to "Iniciar sesión" (sentence case in hero).
- **Why**: PR #53 review noted inconsistency; unified on sentence case (correct Spanish).
- **Scope**: Topbar label, landing hero CTA, and test assertion scoped to hero `<section>` (not matching against Topbar's now-identical label by accident).

### `metadataBase` placement correction (between PR #56 and archive)

- **Original design**: `metadataBase` on `src/app/layout.tsx`.
- **Issue**: Layout wraps `/guest-timer` and `/guest-timer-active`, which are statically prerendered; a base there bakes the build-time origin into their metadata.
- **Fix**: Moved `metadataBase: new URL(siteUrl())` to landing page's own `metadata` export in `src/app/page.tsx`.
- **Rationale**: Landing is the only route with relative metadata URLs and already renders per request. No other route needs `metadataBase`; `robots.ts` and `sitemap.ts` build absolute URLs from `siteUrl()` directly.

### PR #53 title rewrite

- **Was**: "feat: add the shared app shell (#46)"
- **Now**: "feat: add the shared app shell and the public landing page (#46, 1/2)"
- **Reason**: PR #53 includes both shell (PR1) and landing work (PR2), landing needs visibility in commit history.

---

## Native Review Receipt Gate

**Status**: No structured review receipt. This change predates the native review infrastructure and was delivered through ordinary GitHub PR review.

**Evidence**:

- PR #53 (merged `156d8b2`) — shell + landing with bounded review feedback integrated (casing fix, metadataBase relocation)
- PR #56 (merged `a0ef232`) — SEO metadata with CRITICAL robots.txt fix (`467dd4b`)
- Both PRs merged to `main` per orchestrator confirmation; GitHub Issue #46 closed

**No verify-report exists**: This change never ran a formal `sdd-verify` phase. Archive-time verification is based on apply-progress.md runs and final state on main.

---

## Delivery & Merge Notes

**Merge strategy**: Merge commits (not squash) deliberately chosen to preserve PR boundaries:

- PR #53 merge as commit `156d8b2` — includes both shell and landing work
- PR #56 merge as commit `a0ef232` — includes SEO work

**Rationale**: Squashing #53 would have left #56's merge-base before the shell work, causing its diff to re-show all 34 shell files instead of just the 13 SEO ones. Merge commits preserve clean diffs per PR.

**Line count**: ~405–665 changed lines across 3 PRs (forecast: High risk vs 400-line budget; risk accepted and managed via chained PR strategy).

---

## Follow-Ups & Unresolved Items

### Closure-Gated Tasks

- **3.9 (`.env.example`)** — intentional deferral, recorded above

### Disposition-Tracked Review Findings (not fixed)

1. **`URL.canParse` Node version requirement** (flagged in PR #56 review)
   - **Issue**: `siteUrl()` uses `URL.canParse`, requires Node 18.17+; `package.json` has no `engines` floor.
   - **Verdict**: **Non-issue** (investigated and dismissed)
   - **Evidence**: Next.js's own `package.json` declares `engines: {"node": ">=20.9.0"}`. CI pins Node 20. Local runs Node 22. No action required.

2. **`src/app/page.tsx` metadata comment inaccuracy** (flagged in post-apply review)
   - **Issue**: Comment above `metadata` export claims `metadataBase` resolves "per request". It does not: `metadata` is a plain object export evaluated once at module load.
   - **Verdict**: **Documentation follow-up** (not fixed, owner chose not to update)
   - **Impact**: Comment is inaccurate; runtime behavior is correct. Record as open doc issue for future polish pass.

---

## Final State Authority

This archive report describes state **at close on 2026-08-20**, per the Final-State Authority hierarchy:

1. **Native review authority**: none (predates structured receipt system)
2. **Persisted tasks artifact**: `tasks.md` in this archive shows final state: 9/10 complete, 1 intentional deferral approved
3. **Explicit final-state facts from orchestrator**: both PRs merged to main, issue closed, work completed after apply-progress.md written, two review findings dispositioned
4. **`apply-progress.md` snapshots**: intermediate state recorded (valid history at time written; now superseded by final facts above)

Contradictions resolved per hierarchy:

- `apply-progress.md` Run 3 says "BLOCKED, not completed" for 3.9 (sandbox limitation at time).
- **Orchestrator final-state fact**: owner approved deferral on 2026-08-20; archive proceeds with intentional-with-warnings.
- **Record**: task stays unchecked; deferral reason explicit in this report.

**No CRITICAL issues block archive**: PR #56's CRITICAL (`robots.txt` fix) was addressed in commit `467dd4b` post-review; spec is current; no re-run of `sdd-verify` needed.

---

## Artifacts Preserved

All artifacts (proposal, exploration, design, tasks, apply-progress, specs) preserved in this archive folder for audit trail and future reference. Main specs created/updated in `openspec/specs/`.
