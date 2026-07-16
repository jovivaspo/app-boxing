# Proposal: Infrastructure Actions Folder Pattern Compliance (GitHub Issue #9)

## Intent

`src/infraestructure/actions/google-login.action.ts` sits flat (not in a `google-login/` folder) and 6 test files across `actions/`, `auth/`, and `session/` sit flat beside their sources instead of in sibling `__tests__/`. Both violate AGENTS.md's "Server Action folder pattern" (kebab-case folder per Server Action, sibling `__tests__/` project-wide). Architecture-compliance cleanup from the AGENTS.md audit and direct follow-up to Issue #8 (`use-case-folder-pattern`, merged commit 9e845be / PR #11) — NOT a product change. No user-facing outcome, no behavior change, no business tradeoff. The "why" is folder-structure consistency and closing the audit.

## Scope

### In Scope (Issue #9 task list — 7 file moves)

- Full folder-pattern move for the Server Action:
  - `actions/google-login.action.ts` → `actions/google-login/google-login.action.ts`
  - `actions/google-login.action.test.ts` → `actions/google-login/__tests__/google-login.action.test.ts`
- Test-placement-only moves (sources stay put, only tests relocate into sibling `__tests__/`):
  - `auth/backend-auth.adapter.test.ts`, `auth/gsi-loader.adapter.test.ts`, `auth/mappers/user.mapper.test.ts`, `session/cookie-session.adapter.test.ts`, `session/hmac.test.ts`
- Update 1 external consumer import (`src/ui/components/login-card.tsx:15`) + 8 internal relative-import occurrences across the 6 moved test files (`./x` → `../x`).

### Out of Scope

- Renaming legacy third-person test titles to `should...` — dedicated naming pass per AGENTS.md, not this move.
- Flat non-shadcn components under `src/ui/components/` — same audit lineage, deferred to a follow-up issue.
- Any adapter/port logic change — adapters are already compliant (factory functions, correct dependency direction); this is pure file placement.
- Adding an `index.ts` barrel — contradicts AGENTS.md's Server Action folder pattern.

## Capabilities

### New Capabilities

- None. Pure structural refactor.

### Modified Capabilities

- None. No requirement or observable behavior change.

## Approach (Approach 1 from exploration — mechanical move)

1. `git mv` `google-login.action.ts` into `actions/google-login/` and its test into `actions/google-login/__tests__/`; fix its `./google-login.action` → `../google-login.action` (4 dynamic-import occurrences).
2. `git mv` the 5 remaining test files into sibling `__tests__/`; fix each relative import to source (`./x` → `../x`).
3. Update the single external consumer `src/ui/components/login-card.tsx:15` to `@/infraestructure/actions/google-login/google-login.action`.
4. Run `npm run lint`, `npx tsc --noEmit`, `npm run test`.

No barrel — AGENTS.md Server Action pattern omits it. Path aliases (`@/*` → `./src/*`) are wildcard-based; no tsconfig/vitest changes. `gsi-loader.adapter.test.ts`'s `// @vitest-environment jsdom` docblock must stay the file's first line post-move.

## Affected Areas

| Area                                              | Impact    | Description                                |
| ------------------------------------------------- | --------- | ------------------------------------------ |
| `src/infraestructure/actions/google-login/`       | New/Moved | Server Action + test into per-piece folder |
| `auth/`, `auth/mappers/`, `session/` `__tests__/` | New/Moved | 5 test files relocated; sources unchanged  |
| `src/ui/components/login-card.tsx`                | Modified  | Import path update (1 line)                |

## Risks

| Risk                                                                         | Likelihood | Mitigation                                             |
| ---------------------------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| Miss one of 8 relative-import occurrences (`@/`-only grep won't catch these) | Med        | Enumerated list; type-check + test fail loudly         |
| `login-card.tsx` import not updated                                          | Low        | Single consumer; build breaks immediately (fails loud) |
| jsdom docblock displaced during move                                         | Low        | Explicit check that it stays line 1                    |
| Scope creep into adjacent out-of-scope violations                            | Low        | Non-goals stated; hold line to Issue #9                |

## Rollback Plan

Trivial. Pure file moves on the feature branch — `git revert` the PR or reset the branch. No data, no behavior, no migration at stake.

## Dependencies

None. No new packages, no config changes, no external contracts.

## Success Criteria

- [x] Server Action `google-login.action.ts` in `actions/google-login/` + test in its `__tests__/`, no `index.ts`.
- [x] 5 remaining test files moved into sibling `__tests__/`; their sources unchanged.
- [x] External consumer (`login-card.tsx`) + all 8 relative-import occurrences updated; no dangling imports.
- [x] `gsi-loader.adapter.test.ts` jsdom docblock remains line 1.
- [x] `npm run lint`, `npx tsc --noEmit`, `npm run test` all pass with zero behavior change.

## Process note (from exploration — not this issue's scope)

Issue #8's archive step copied rather than moved its change folder (`openspec/changes/use-case-folder-pattern/` still exists alongside its archive). The apply/archive step for this change should MOVE (not copy) the active folder into `archive/YYYY-MM-DD-infra-actions-folder-pattern/`.

## Proposal question round

None warranted. This is a pure structural/mechanical refactor (file moves + import-path fixes) with no user-facing behavior change and no new capability — there is no business/product decision surface to shape. Scope is fully fixed by the Issue #9 task list and verified against live files (zero drift), matching the Issue #8 precedent in kind.
