# Archive Report: Timer Configuration Screens (issue #21)

**Date**: 2026-07-27
**Change**: `timer-configuration-screens`
**Status**: ARCHIVED — spec-complete, implementation verified, PR #30 merged to main

## Traceability

All SDD artifacts preserved in Engram:

| Artifact       | Observation ID | Purpose                                                                              |
| -------------- | -------------- | ------------------------------------------------------------------------------------ |
| Proposal       | #102           | Scope, intent, approach, rollback plan                                               |
| Spec           | #103           | Delta specs: repository port (modified), persistence (modified), screens (new)       |
| Design         | #104           | Architecture decisions (D1-D7), data flow, file changes, contracts, testing strategy |
| Tasks          | #105           | Implementation task list (4 slices, all complete), delivery decisions, PR slicing    |
| Apply Progress | #106           | Slice-by-slice implementation status and learnings                                   |
| Verify Report  | #107           | Full verification pass: 0 CRITICAL, code spec-compliant, all checks green            |

## Main Specs Synced

All delta specs merged into the project's authoritative main specs under `openspec/specs/`:

### New Main Spec: `timer-configuration-repository`

- **Path**: `openspec/specs/timer-configuration-repository/spec.md`
- **Source**: Delta from change (observation #103)
- **Scope**: `TimerConfigurationRepositoryPort` contract — interface-only, all 5 methods (create/list/getById/update/delete)
- **Status**: Created fresh (no prior main spec existed from issue #18)

### Updated Main Spec: `timer-configuration-persistence`

- **Path**: `openspec/specs/timer-configuration-persistence/spec.md`
- **Source**: Existing main spec + delta merge from change (observation #103)
- **Changes**:
  - Updated Local Adapter requirement from 4 to 5 methods (added `getById` scenarios)
  - Updated Backend Adapter requirement from 4 to 5 methods (added `getById` scenarios)
  - Preserved all existing requirements (create/list/update/delete) unchanged
- **Status**: Merged successfully

### New Main Spec: `timer-configuration-screens`

- **Path**: `openspec/specs/timer-configuration-screens/spec.md`
- **Source**: Delta from change (observation #103)
- **Scope**: User-facing screens (list, create/edit form), Server Actions surface, guest/auth dual paths
- **Status**: Created fresh (new capability)

## Implementation Outcome

**All 4 slices COMPLETE** (observation #105):

| Slice                             | Tasks   | Status         |
| --------------------------------- | ------- | -------------- |
| 1 — Foundations                   | 1.1-1.7 | Merged to main |
| 2a — Result + list/delete actions | 2.1-2.3 | Merged to main |
| 2b — Create/update actions        | 2.4-2.5 | Merged to main |
| 3 — List screen                   | 3.1-3.5 | Merged to main |
| 4 — Form screen (size:exception)  | 4.1-4.4 | Merged to main |

Tasks/tasks.md planned a stacked-PR delivery (5 separate PRs), but the user explicitly chose to ship the whole change as a **single PR (#30)** instead — all 4 slices landed as sequential commits on one branch/PR, not 5 separate PRs.

**Tests**: All 218/218 passed in final verify. No regressions.
**Lint/Type**: 0 errors, all checks clean before PR merge.

## Post-Merge Fixes

PR #30 received **two subsequent fix commits after the original apply/verify pass**:

### Fix 1: StrictMode/Validation Issues (automated PR review catch)

**Commits**: `79c5fff`, `1330203`
**Issues found**:

1. **Impure setState updater in list hook** — `timer-configuration-list.hook.ts` was re-firing delete calls under StrictMode double-render due to effect not properly guarding against repeated setup
2. **Mislabeled error copy** — `DELETE_ERROR` constant was reused for both initial-load failure and delete failure; the summary error message would say "Failed to load timers" when it should say "Failed to delete timer"
3. **Related `isEmpty` logic** — query state and error state were not cleanly separated during error cases

**Root cause**: Original implementation did not account for StrictMode's double-rendering during development; error state handling was cosmetically confused.

**Impact**: Both bugs were caught by the PR reviewer running the app locally under StrictMode. Fixed before merge. All tests still passed after fix (tests don't run in StrictMode by default, so the bugs were only visible at runtime in dev mode).

### Fix 2: DTO Field Mismatch (manual testing catch)

**Commit**: Direct fix in the review PR before merge
**Issue found**:

- The DTO's `restDuration` field was named **`restDuration`** in the code, but the actual backend wire protocol uses **`rest`** (confirmed via `requests/boxing.http` + live backend)
- This broke `list()`, `getById()`, `create()`, and `update()` operations against the real backend
- The mismatch was invisible to the automated test suite because all tests used mocked fetch responses that matched the **wrong** DTO schema

**Root cause**: Domain model uses `restDuration` (seconds), but the backend API wire format uses shorter names (`rest`). The mapper that converts from DTO to domain didn't rename the field; instead the DTO was left misnamed.

**Fix**:

1. Renamed the DTO's `restDuration` field to `rest` to match the backend wire format (`roundDuration` was already correct and unchanged — only `rest` was mismatched)
2. Added a new **outbound** mapper `toTimerConfigurationRequestBody` to convert domain `restDuration` back to wire `rest` when sending data to the backend
3. Inbound mapper `toTimerConfiguration` now reads from the correct `rest` field

**Impact**: Critical fix. The change would have shipped with broken create/update/delete operations against the production backend. Fixed during the PR review cycle before final merge. Tests still passed after fix (mocks were updated to use the correct field names).

## Verification Status

**Verdict** (observation #107): **PASS**

- 0 CRITICAL issues in the verified state
- Code spec-compliant against all delta-spec scenarios
- All architectural decisions (D1-D7) correctly implemented
- Architecture rules followed (no classes, Server Action calls only in hooks, etc.)
- Test suite: 218/218 green
- Type-check: clean
- Lint: 0 errors
- Build: succeeds
- Format: clean

**Note**: The verify pass was conducted against `feat/21-timer-configuration-screens` branch **before** the post-merge fixes. The fixes address issues found during PR review (StrictMode double-renders) and manual testing against the live backend (DTO field mismatch). Both fixes were already merged by the time this archive is created, so the change in `main` is correct. The verify report did not catch these two issues because:

1. **StrictMode issues**: Tests don't run in StrictMode; only visible at dev-time runtime in the browser
2. **DTO mismatch**: All tests used mocked fetch with the wrong schema; the mismatch was only visible when testing against the real backend

## Change Folder Movement

**From**: `openspec/changes/timer-configuration-screens/`
**To**: `openspec/changes/archive/2026-07-27-timer-configuration-screens/`

All SDD artifacts from the change folder have been moved:

- proposal.md ✓
- design.md ✓
- tasks.md ✓
- verify-report.md ✓
- apply-progress.md ✓
- explore.md ✓
- specs/ (delta specs) ✓

## Rollback Information

The change is purely additive except for:

1. New `getById` method on `TimerConfigurationRepositoryPort` (non-breaking: existing methods unchanged)
2. Link to `/timers` added to `app/page.tsx`

**Rollback path** (if needed):

- Delete `/src/app/timers/` (all routes)
- Delete `/src/infraestructure/actions/{list,create,update,delete}-timer-configuration/` (4 actions)
- Delete `/src/ui/components/{timer-configuration-list,timer-configuration-card,timer-configuration-form,rounds-stepper}/` (4 new components)
- Delete `/src/application/use-cases/get-timer-configuration/` (1 new use case)
- Delete `/src/application/timer-configuration/timer-configuration-result.ts` (result mapper)
- Delete `/src/lib/duration.ts` (duration utilities)
- Remove `getById` implementation from both adapters and the port
- Remove `/timers` link from `app/page.tsx`
- Remove button/input/switch from `src/ui/components/shadcn/`

Nothing in the codebase depends on these new pieces, so deletion is clean.

## Conclusion

Issue #21 (timer-configuration-screens) is **COMPLETE** and **ARCHIVED**. All four slices implemented, verified spec-compliant, and merged to main (PR #30). Two post-merge fixes corrected runtime issues found during review and manual testing. The change enables users to view, create, edit, and delete timer configurations through a web UI.

**SDD Cycle CLOSED**: This change moves from active development to archived history. Future maintenance is tracked through GitHub issues.
