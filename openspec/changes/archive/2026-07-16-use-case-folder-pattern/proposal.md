# Proposal: Use-Case Folder Pattern Compliance

## Intent

`src/application/use-cases/` holds 6 flat files (3 use cases + colocated tests) and `src/domain/errors/auth-errors.test.ts` sits flat beside its source. Both violate AGENTS.md's documented "Use case folder pattern" (kebab-case folder per piece, sibling `__tests__/`). This is an architecture-compliance cleanup surfaced by an audit against AGENTS.md — not a product change. There is no user-facing outcome, no behavior change, and no business tradeoff to weigh; the "why" is folder-structure consistency and unblocking the audit.

## Scope

### In Scope (GitHub Issue #8 task list)

- Move each use case into its own kebab-case folder with a sibling `__tests__/`:
  - `get-current-session.ts` → `get-current-session/get-current-session.ts` + `__tests__/`
  - `sign-in-with-google.ts` → `sign-in-with-google/sign-in-with-google.ts` + `__tests__/`
  - `sign-out.ts` → `sign-out/sign-out.ts` + `__tests__/`
- Move `src/domain/errors/auth-errors.test.ts` into `src/domain/errors/__tests__/`.
- Update all consumer imports (12 external references enumerated in exploration).

### Test Quality Review (in scope: verify-only, no rename)

Review the 4 relocated test files for compliance with AGENTS.md "Testing" / "Test Writing Rules" and the `vitest` + `react-testing-library` skills. **Compliant** means: titles describe observable behavior; one behavior/concept per test; Arrange-Act-Assert with blank-line separation; `describe` named after the unit; mocks only at port/adapter boundaries (domain tests use no mocks); deterministic (no real network/timers/system time); order/isolation-independent.

Concrete findings from reading each file:

| File                           | AAA + blanks |  `describe` = unit  |               Mock boundary               |       Deterministic        | Verdict   |
| ------------------------------ | :----------: | :-----------------: | :---------------------------------------: | :------------------------: | --------- |
| `get-current-session.test.ts`  |      ✅      |         ✅          |       ✅ mocks `SessionPort` (port)       | ✅ hardcoded fixture dates | Compliant |
| `sign-in-with-google.test.ts`  |      ✅      |         ✅          | ✅ mocks `AuthPort`+`SessionPort` (ports) |             ✅             | Compliant |
| `sign-out.test.ts`             |      ✅      |         ✅          |       ✅ mocks `SessionPort` (port)       |             ✅             | Compliant |
| `auth-errors.test.ts` (domain) |      ✅      | ✅ (per factory fn) |  ✅ **zero mocks** (correct for domain)   |             ✅             | Compliant |

- Multi-assertion tests (e.g. "exchanges the ID token, persists the session, and returns it") assert one cohesive behavior via a **single Act**, so they satisfy one-concept-per-test — not a split-worthy "and" violation.
- `react-testing-library` is not exercised by any of the 4 (all are pure domain/application unit tests, no DOM) — correct per the layer testing strategy; no jsdom needed.
- **Only deviation: legacy third-person titles** (not starting with `should`) in all 4 files. AGENTS.md explicitly excludes fixing these in an unrelated PR ("rename them only in a dedicated pass, never mixed into unrelated PRs"), so **no rename here**.

**Resolution: verified compliant — no fix needed.** No real (non-naming) violation found, so this point produces **no** `sdd-tasks` task beyond a mechanical move; the legacy-naming rename is deferred to its own dedicated pass.

### Out of Scope (deferred to a follow-up issue)

- Flat Server Action `src/infraestructure/actions/google-login.action.ts` not in a `google-login/` folder — same audit lineage, NOT this change.
- Flat non-shadcn components under `src/ui/components/` (`login-card.tsx`, etc.) — deferred.
- Renaming legacy third-person test titles to `should...` — belongs in a dedicated naming pass per AGENTS.md, not this move.

## Capabilities

### New Capabilities

- None. Pure structural refactor; no capability introduced.

### Modified Capabilities

- None. No requirement or observable behavior changes.

## Approach

Mechanical move (Approach 1 from exploration):

1. `git mv` each `.ts`/`.test.ts` pair into its new folder + `__tests__/`.
2. Fix the now-broken relative import inside each moved test (`./x` → `../x`) — same for `auth-errors.test.ts` (`./auth-errors` → `../auth-errors`).
3. Update the 12 external `@/application/use-cases/...` and `@/domain/errors/auth-errors` references, plus the 2 comment-only JSDoc `@throws` paths for consistency.
4. Run `npm run lint`, `npx tsc --noEmit`, `npm run test`.

No `index.ts` barrel — AGENTS.md's use-case pattern intentionally omits it (adding one would create a new inconsistency). Path aliases (`@/*` → `./src/*`) are wildcard-based; no `tsconfig`/`vitest` config changes needed.

## Affected Areas

| Area                                                          | Impact   | Description                              |
| ------------------------------------------------------------- | -------- | ---------------------------------------- |
| `src/application/use-cases/*`                                 | Moved    | 3 files + 3 tests into per-piece folders |
| `src/domain/errors/auth-errors.test.ts`                       | Moved    | Into sibling `__tests__/`                |
| `src/app/page.tsx`, `profile/page.tsx` (+ tests)              | Modified | Import path update                       |
| `src/app/api/logout/route.ts`                                 | Modified | Import path update                       |
| `src/infraestructure/actions/google-login.action.ts` (+ test) | Modified | Import path update                       |
| `src/infraestructure/auth/backend-auth.adapter.ts`            | Modified | Import path update                       |
| `src/application/ports/auth.port.ts`                          | Modified | JSDoc `@throws` path (comment-only)      |

## Risks

| Risk                                                       | Likelihood | Mitigation                                                          |
| ---------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| Miss one of the 12 import updates                          | Med        | Enumerated list from exploration; type-check + test catch real refs |
| Relative-import gotcha in the 3 moved tests (`./` → `../`) | Med        | Explicitly called out; tests fail loudly if wrong                   |
| Scope creep into out-of-scope adjacent violations          | Low        | Non-goals stated; hold line to Issue #8                             |

## Rollback Plan

Trivial. Pure file moves on a feature branch (`refactor/8-use-case-folder-pattern`) — `git revert` the PR or reset the branch. No data, no behavior, no migration at stake.

## Dependencies

- None. No new packages, no config changes, no external contracts.

## Success Criteria

- [ ] All use cases live in per-piece kebab-case folders with sibling `__tests__/`, no `index.ts`.
- [ ] `auth-errors.test.ts` moved into `src/domain/errors/__tests__/`.
- [ ] All 12 consumer references and 2 JSDoc paths updated; no dangling imports.
- [ ] The 4 relocated test files confirmed compliant with AGENTS.md test rules (legacy naming excluded) — no test-content change required.
- [ ] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass with zero behavior change.
