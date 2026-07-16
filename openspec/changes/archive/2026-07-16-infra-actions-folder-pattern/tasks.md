# Tasks: Infrastructure Actions Folder Pattern Compliance (Issue #9)

## Review Workload Forecast

| Field                   | Value                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~40-50 (7 git mv renames, 1 zero-content-diff; 19 one-line import edits ×2 diff lines + 1 external-consumer edit) |
| 400-line budget risk    | Low                                                                                                               |
| Chained PRs recommended | No                                                                                                                |
| Suggested split         | Single PR                                                                                                         |
| Delivery strategy       | ask-on-risk                                                                                                       |
| Chain strategy          | pending                                                                                                           |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                              | Likely PR | Notes                                                              |
| ---- | --------------------------------- | --------- | ------------------------------------------------------------------ |
| 1    | All 7 pieces + Definition of Done | PR 1      | Single cohesive PR; base = main; tests travel with each moved file |

Execution order: Phases 1-6 touch disjoint file sets but per design MUST run sequentially, one piece fully verified (`tsc` + scoped test) before the next — keeps the tree green/bisectable. Phase 7 depends on Phases 1-6 complete.

Spec traceability: Phase 1 satisfies "Server Action Module Folder Organization". Phases 2-6 satisfy "Infrastructure Test Co-location".

### Testing Mode

Strict TDD is active project-wide, but this is a pure structural refactor with zero new behavior — no RED/GREEN/REFACTOR cycle applies. Per Issue #8's precedent, the existing test suite is the acceptance contract (Approval Testing variant): each piece's move is correct iff `tsc` and the scoped test run stay green with unchanged assertions.

## Phase 1: google-login (full folder move)

- [x] 1.1 `mkdir -p src/infraestructure/actions/google-login/__tests__`
- [x] 1.2 `git mv src/infraestructure/actions/google-login.action.ts src/infraestructure/actions/google-login/google-login.action.ts`
- [x] 1.3 `git mv src/infraestructure/actions/google-login.action.test.ts src/infraestructure/actions/google-login/__tests__/google-login.action.test.ts`
- [x] 1.4 Fix moved test's 4 relative imports `./google-login.action` → `../google-login.action` (lines 60/83/93/103)
- [x] 1.5 Update external consumer `src/ui/components/login-card.tsx:15` → `@/infraestructure/actions/google-login/google-login.action`
- [x] 1.6 Verify: `npx tsc --noEmit && npm run test src/infraestructure/actions src/ui/components`
- [x] 1.7 Confirm no `index.ts` barrel added to `google-login/`

## Phase 2: backend-auth.adapter (test placement only)

- [x] 2.1 `mkdir -p src/infraestructure/auth/__tests__`
- [x] 2.2 `git mv src/infraestructure/auth/backend-auth.adapter.test.ts src/infraestructure/auth/__tests__/backend-auth.adapter.test.ts`
- [x] 2.3 Fix relative import `./backend-auth.adapter` → `../backend-auth.adapter` (1x)
- [x] 2.4 Verify: `npx tsc --noEmit && npm run test src/infraestructure/auth`

## Phase 3: gsi-loader.adapter (test placement only)

- [x] 3.1 `git mv src/infraestructure/auth/gsi-loader.adapter.test.ts src/infraestructure/auth/__tests__/gsi-loader.adapter.test.ts`
- [x] 3.2 Fix relative import `./gsi-loader.adapter` → `../gsi-loader.adapter` (1x) — `// @vitest-environment jsdom` MUST stay line 1
- [x] 3.3 Verify: `npx tsc --noEmit && npm run test src/infraestructure/auth`

## Phase 4: user.mapper (test placement only)

- [x] 4.1 `mkdir -p src/infraestructure/auth/mappers/__tests__`
- [x] 4.2 `git mv src/infraestructure/auth/mappers/user.mapper.test.ts src/infraestructure/auth/mappers/__tests__/user.mapper.test.ts`
- [x] 4.3 Fix relative import `./user.mapper` → `../user.mapper` (1x)
- [x] 4.4 Verify: `npx tsc --noEmit && npm run test src/infraestructure/auth/mappers`

## Phase 5: hmac (test placement only)

- [x] 5.1 `mkdir -p src/infraestructure/session/__tests__`
- [x] 5.2 `git mv src/infraestructure/session/hmac.test.ts src/infraestructure/session/__tests__/hmac.test.ts`
- [x] 5.3 Fix relative import `./hmac` → `../hmac` (1x)
- [x] 5.4 Verify: `npx tsc --noEmit && npm run test src/infraestructure/session`

## Phase 6: cookie-session.adapter (test placement only)

- [x] 6.1 `git mv src/infraestructure/session/cookie-session.adapter.test.ts src/infraestructure/session/__tests__/cookie-session.adapter.test.ts`
- [x] 6.2 Fix relative imports: `./hmac` → `../hmac` (1x, line 4) + `./cookie-session.adapter` → `../cookie-session.adapter` (10x, lines 70/86/112/123/134/144/159/172/184/198)
- [x] 6.3 Verify: `npx tsc --noEmit && npm run test src/infraestructure/session`

## Phase 7: Definition of Done (full-suite verification)

- [x] 7.1 `npm run lint` — zero errors
- [x] 7.2 `npx tsc --noEmit` — zero errors project-wide
- [x] 7.3 `npm run test` — full suite green, zero behavior change
- [x] 7.4 Confirm no barrel `index.ts` added anywhere
- [x] 7.5 `git status` sanity check: 7 renames + 1 modified (`login-card.tsx`), no stray/untracked files
- [x] 7.6 Re-verify import-fix count against design: 19 occurrences across 6 test files + 1 external consumer, exactly as enumerated in Phases 1-6

## Status: 31/31 tasks complete. Ready for verify.
