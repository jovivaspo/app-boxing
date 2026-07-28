# Archive Report: Shared httpClient for Backend Adapters (Issue #28)

**Date Archived**: 2026-07-28
**Change Name**: shared-http-client
**Mode**: hybrid (Engram source of truth + openspec file snapshot)
**Status**: ARCHIVED

## Executive Summary

The shared-http-client change (Issue #28) is complete, verified, and archived. PR #36 merged to main; all implementation work delivered with behavior parity across both backend adapters (auth, timer-configuration). No new/modified/removed capabilities — pure internal refactor with full test coverage (288/288 passing).

## Task Completion Gate

**Result**: PASS

All 14 tasks in `tasks.md` (rev-2) are marked complete across 4 phases:

- Phase 1: httpClient factory rewrite (3/3)
- Phase 2: auth adapter refactor (2/2)
- Phase 3: timer-configuration adapter refactor (4/4)
- Phase 4: verification gate (3/3)

Behavior-parity proof: `git diff -- src/infraestructure/auth/__tests__/ src/infraestructure/timer-configuration/__tests__/` is empty — neither adapter test suite was edited.

## Spec Sync Analysis

**Capability Impact Declaration** (from delta spec): NO ADDED, MODIFIED, REMOVED, or RENAMED requirements in any existing capability.

**Main specs referenced** (unchanged by construction, confirmed — no delta to merge):

- `openspec/specs/session-authentication/spec.md`
- `openspec/specs/timer-configuration-persistence/spec.md`
- `openspec/specs/infraestructure-structure/spec.md`

**Merge result**: NO-OP. Verified by re-reading the three main specs — none reference this change and none needed edits.

**Delta spec hygiene**: the delta spec (`specs/shared-http-client/spec.md`) was corrected to the rev-2 API (`createHttpClient()` returning `{ get, post, put, delete }`) before this archive — it does **not** contain stale rev-1 symbols (`httpClient(url, init)`/`parseJsonBody(response)`). An earlier verify-report warning about staleness was already resolved prior to merge; that warning no longer applies and should not be treated as outstanding.

## Implementation Summary

| File                                                                             | Action                                                                                                                                                |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/infraestructure/http/httpClient.ts`                                         | `createHttpClient()` factory: `get`/`post`/`put`/`delete`, network-failure mapping only                                                               |
| `src/infraestructure/http/__tests__/httpClient.test.ts`                          | Unit tests for all four verbs                                                                                                                         |
| `src/infraestructure/auth/backend-auth.adapter.ts`                               | Consumes `createHttpClient()`; keeps its own `catch`/`backendUnavailable` remap                                                                       |
| `src/infraestructure/timer-configuration/backend-timer-configuration.adapter.ts` | `requestJson` deleted; 5 call sites use `createHttpClient()`; `parseDto` keeps its own JSON-parse `try/catch` + Zod `safeParse`; `ensureOk` untouched |

**Independent verification**: `npm run lint` (0 errors), `npx tsc --noEmit` (clean), `npm run test` (288/288 passing).

## Design Adherence (rev-2)

- D1: Verb-method factory chosen over a single `httpClient(url, init)` function or classes.
- D2: Timer-configuration propagates the neutral network error unchanged (no wrapper reintroduced) — an explicit, accepted tradeoff.
- D3: JSON parsing returned to each adapter; `parseJsonBody` deleted from the shared module.
- Dead code (`isHttpClientError`, `HttpClientErrorName`) removed after a readability review found zero callers.

## Notes for Next Changes

- `src/infraestructure/http/httpClient.ts` (`createHttpClient()`) is now the established shared HTTP client for future backend adapters (fighters, gym activity, etc.) — call `http.get/post/put/delete`, then handle status codes, JSON parsing, and Zod validation locally, same pattern as the two adapters refactored here.
- No `parseJsonBody` helper exists — do not expect one.

## SDD Cycle Complete

proposal → spec → design (2 revisions) → tasks (2 revisions) → apply (2 revisions) → verify → archive. All artifacts persisted in Engram and archived here as a file snapshot.
