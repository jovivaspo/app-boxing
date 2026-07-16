# Design: Infrastructure Actions Folder Pattern Compliance (Issue #9)

## Technical Approach

Mechanical, behavior-preserving folder refactor. Move ONE Server Action (`google-login`) into a per-piece kebab-case folder with sibling `__tests__/`, and relocate 5 more test files into sibling `__tests__/` (their sources stay put). No barrels, no config changes (`@/*` → `./src/*` is a directory-root wildcard). Design value = exact per-piece move order + AUTHORITATIVE relative-import edit list so the tree stays green after each piece.

Execute ONE piece fully (move → fix moved test's relative imports → update that piece's external consumer → verify tsc+test) before the next. Never batch all 6 moves then all import fixes — that makes breakage un-bisectable.

## Architecture Decisions

| Decision                  | Choice                                    | Rejected                       | Rationale                                                                                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Move mechanism            | `git mv`                                  | delete+recreate                | Preserves blame/log history.                                                                                                                                                                                                                                  |
| Sequencing                | One piece fully, then next                | Batch all moves then all fixes | Tree buildable/testable after each piece; trivial bisect.                                                                                                                                                                                                     |
| Barrel files              | None                                      | `index.ts` per folder          | AGENTS.md Server Action pattern intentionally omits the barrel.                                                                                                                                                                                               |
| 5 test-placement sources  | Do NOT touch source or its `@/` consumers | Rename source aliases too      | Only the TEST moves; each source keeps its path, so every `@/`-alias consumer stays valid. Editing them breaks correct code.                                                                                                                                  |
| Relative-import transform | Uniform per-file `"./x"` → `"../x"`       | Guess each occurrence          | Every moved test drops exactly one level deeper relative to its source (incl. google-login, where source+test both move but test gets the extra `__tests__/`). VERIFIED all 6 files contain zero other `"./`-prefixed literals, so the transform is 1:1 safe. |

## CORRECTION to proposal edit count (authoritative — like Issue #8's correction)

Proposal says "**8** internal relative-import occurrences." That UNDER-COUNTS (it missed the repeated dynamic `await import()` calls). VERIFIED live count = **19 textual occurrences** across **7 distinct specifiers** in **6 files**:

- `actions/google-login.action.test.ts`: **4** (`./google-login.action`, lines 60/83/93/103)
- `auth/backend-auth.adapter.test.ts`: **1** (`./backend-auth.adapter`, l3)
- `auth/gsi-loader.adapter.test.ts`: **1** (`./gsi-loader.adapter`, l4)
- `auth/mappers/user.mapper.test.ts`: **1** (`./user.mapper`, l5)
- `session/hmac.test.ts`: **1** (`./hmac`, l3)
- `session/cookie-session.adapter.test.ts`: **11** (`./hmac` l4 ×1 + `./cookie-session.adapter` ×10: l70/86/112/123/134/144/159/172/184/198)

Plus **1 external consumer**: `src/ui/components/login-card.tsx:15`. Confirmed `google-login.action` is referenced by exactly 2 files (its test + login-card). sdd-tasks/sdd-apply MUST use **19 (not 8)**; the 10 dynamic imports in cookie-session are the easiest to miss.

## Move Sequencing (per-piece playbook)

**Piece A — google-login (full folder move):**

1. `mkdir -p src/infraestructure/actions/google-login/__tests__`
2. `git mv actions/google-login.action.ts actions/google-login/google-login.action.ts`
3. `git mv actions/google-login.action.test.ts actions/google-login/__tests__/google-login.action.test.ts`
4. Moved test: `"./google-login.action"` → `"../google-login.action"` (4×)
5. External consumer `login-card.tsx:15` → `@/infraestructure/actions/google-login/google-login.action`
6. Verify: `npx tsc --noEmit` + `npm run test src/infraestructure/actions`

**Pieces B–F — test-placement only (source stays, NO external-consumer change):**
For each: `mkdir -p <dir>/__tests__` → `git mv <test> <dir>/__tests__/` → fix `"./x"`→`"../x"` → verify tsc+test.

- B `auth/backend-auth.adapter.test.ts` (1×)
- C `auth/gsi-loader.adapter.test.ts` (1×) — **`// @vitest-environment jsdom` MUST stay line 1**; only l4 import changes, prepend nothing.
- D `auth/mappers/user.mapper.test.ts` (1×)
- E `session/hmac.test.ts` (1×)
- F `session/cookie-session.adapter.test.ts` (11×: `../hmac` + 10× `../cookie-session.adapter`)

## File Changes

| Path                                                               | Action    | Note                                  |
| ------------------------------------------------------------------ | --------- | ------------------------------------- |
| `actions/google-login/google-login.action.ts`                      | Move      | from `actions/google-login.action.ts` |
| `actions/google-login/__tests__/google-login.action.test.ts`       | Move+edit | 4 relative fixes                      |
| `auth/__tests__/{backend-auth.adapter,gsi-loader.adapter}.test.ts` | Move+edit | 1 fix each                            |
| `auth/mappers/__tests__/user.mapper.test.ts`                       | Move+edit | 1 fix                                 |
| `session/__tests__/{hmac,cookie-session.adapter}.test.ts`          | Move+edit | 1 + 11 fixes                          |
| `src/ui/components/login-card.tsx`                                 | Modify    | l15 alias suffix `/google-login`      |

## Testing Strategy

No test-content change beyond import specifiers (legacy third-person titles deferred per AGENTS.md). Correctness = existing suite passes unchanged. Dynamic `await import()` paths ARE type-checked by tsc, so a missed occurrence fails loud (module-not-found) at both tsc and test time. Per-piece tsc/test checkpoints localize any miss.

## Final Verification (Definition of Done)

`npm run lint && npx tsc --noEmit && npm run test` — all green, zero behavior change. No barrels created. jsdom docblock line 1 intact.

## Migration / Rollout

None. Pure file moves on the feature branch; rollback = revert PR / reset branch.

## Process notes / Risks

- **Primary risk**: the proposal's "8" undercount — corrected to 19 above; enumerate cookie-session's 10 dynamic imports explicitly.
- **Archive step (future, not this code change)**: Issue #8's archive COPIED (not moved) `openspec/changes/use-case-folder-pattern/`, leaving a leftover on disk. When THIS change reaches archive, **MOVE** `openspec/changes/infra-actions-folder-pattern/` into `archive/YYYY-MM-DD-infra-actions-folder-pattern/` (do not copy). Do NOT clean up Issue #8's leftover here — out of scope.

## Open Questions

None blocking. Discrepancy resolved: proposal "8 relative-import occurrences" corrected to 19 occurrences / 7 specifiers / 6 files + 1 external consumer.
