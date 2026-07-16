# Tasks: Use-Case Folder Pattern Compliance (Issue #8)

## Review Workload Forecast

| Field                   | Value                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| Estimated changed lines | ~20-30 (7 `git mv` renames, 3 with zero content diff; 11 one-line import edits) |
| 400-line budget risk    | Low                                                                             |
| Chained PRs recommended | No                                                                              |
| Suggested split         | Single PR                                                                       |
| Delivery strategy       | ask-on-risk                                                                     |
| Chain strategy          | pending                                                                         |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                              | Likely PR | Notes                                                                  |
| ---- | --------------------------------- | --------- | ---------------------------------------------------------------------- |
| 1    | All 4 pieces + Definition of Done | PR 1      | Single cohesive PR; base = main; tests travel with each moved use case |

**Execution order**: Phases 1-4 touch disjoint file sets and are technically independent, but per design MUST run sequentially, one piece fully verified before starting the next (keeps the tree green/bisectable — never batch all moves then all import fixes). Phase 5 is sequential and depends on Phases 1-4 complete.

**Spec traceability**: Phases 1-4 satisfy `sdd/use-case-folder-pattern/spec` → Requirement "Use-Case Module Folder Organization" (per-piece kebab-case folder + sibling `__tests__/`). Phase 4 additionally satisfies the "Domain error test co-location" scenario.

## Phase 1: get-current-session

- [x] 1.1 `mkdir -p src/application/use-cases/get-current-session/__tests__`
- [x] 1.2 `git mv src/application/use-cases/get-current-session.ts src/application/use-cases/get-current-session/get-current-session.ts`
- [x] 1.3 `git mv src/application/use-cases/get-current-session.test.ts src/application/use-cases/get-current-session/__tests__/get-current-session.test.ts`
- [x] 1.4 In the moved test, fix relative import `from "./get-current-session"` → `from "../get-current-session"`
- [x] 1.5 Update 4 external consumers to alias `@/application/use-cases/get-current-session/get-current-session`: `src/app/page.tsx:4`, `src/app/page.test.tsx:25` (`vi.mock`), `src/app/profile/page.tsx:6`, `src/app/profile/page.test.tsx:32` (`vi.mock`)
- [x] 1.6 Verify: `npx tsc --noEmit` && `npm run test src/application/use-cases/get-current-session src/app`

## Phase 2: sign-in-with-google

- [x] 2.1 `mkdir -p src/application/use-cases/sign-in-with-google/__tests__`
- [x] 2.2 `git mv src/application/use-cases/sign-in-with-google.ts src/application/use-cases/sign-in-with-google/sign-in-with-google.ts`
- [x] 2.3 `git mv src/application/use-cases/sign-in-with-google.test.ts src/application/use-cases/sign-in-with-google/__tests__/sign-in-with-google.test.ts`
- [x] 2.4 In the moved test, fix relative import `from "./sign-in-with-google"` → `from "../sign-in-with-google"`
- [x] 2.5 Update 2 external consumers by appending `/sign-in-with-google` to the alias: `src/infraestructure/actions/google-login.action.ts:7`, `src/infraestructure/actions/google-login.action.test.ts:27` (`vi.mock`)
- [x] 2.6 Verify: `npx tsc --noEmit` && `npm run test src/application/use-cases/sign-in-with-google src/infraestructure/actions/google-login`

## Phase 3: sign-out

- [x] 3.1 `mkdir -p src/application/use-cases/sign-out/__tests__`
- [x] 3.2 `git mv src/application/use-cases/sign-out.ts src/application/use-cases/sign-out/sign-out.ts`
- [x] 3.3 `git mv src/application/use-cases/sign-out.test.ts src/application/use-cases/sign-out/__tests__/sign-out.test.ts`
- [x] 3.4 In the moved test, fix relative import `from "./sign-out"` → `from "../sign-out"`
- [x] 3.5 Update 1 external consumer by appending `/sign-out` to the alias: `src/app/api/logout/route.ts:4`
- [x] 3.6 Verify: `npx tsc --noEmit` && `npm run test src/application/use-cases/sign-out src/app/api/logout`

## Phase 4: auth-errors (test-only move, domain layer)

- [x] 4.1 `mkdir -p src/domain/errors/__tests__`
- [x] 4.2 `git mv src/domain/errors/auth-errors.test.ts src/domain/errors/__tests__/auth-errors.test.ts` — source `auth-errors.ts` does NOT move
- [x] 4.3 In the moved test, fix relative import `from "./auth-errors"` → `from "../auth-errors"`
- [x] 4.4 No external consumer edits — the `@/domain/errors/auth-errors` alias is unchanged for all 5 consumers (including 2 JSDoc-only `@throws` refs)
- [x] 4.5 Verify: `npx tsc --noEmit` && `npm run test src/domain/errors`

## Phase 5: Definition of Done (full-suite verification)

- [x] 5.1 Run `npm run lint` — zero errors
- [x] 5.2 Run `npx tsc --noEmit` — zero errors project-wide
- [x] 5.3 Run `npm run test` — full suite green, zero behavior change
- [x] 5.4 Confirm no `index.ts` barrel was added to any use-case folder (AGENTS.md pattern intentionally omits it)
- [x] 5.5 `git status` sanity check: 7 renames + 7 standalone modified files (external alias updates) — the other 4 of the design's "11 edits" are relative-import fixes folded into the rename entries themselves (git shows them as `RM`, not separate `M` lines), so they don't appear as additional modified-file lines. Only untracked path is `openspec/changes/use-case-folder-pattern/` (expected SDD artifact snapshot). No stray files.
