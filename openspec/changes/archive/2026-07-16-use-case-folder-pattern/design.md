# Design: Use-Case Folder Pattern Compliance (Issue #8)

## Technical Approach

Mechanical, behavior-preserving folder refactor. Move the 3 use cases into per-piece
kebab-case folders with sibling `__tests__/`, and move `auth-errors.test.ts` into a
sibling `__tests__/`. No barrels, no config changes (the `@/*` → `./src/*` alias is a
directory-root wildcard). The design's only real value is the **exact move order** and the
**authoritative edit list** so the working tree stays buildable after every piece.

Execute **one piece fully at a time** (move → fix moved test's relative import → update that
piece's external consumers → verify) so the tree returns to green after each piece and any
breakage is trivially bisectable — never batch all 7 moves and discover breakages at the end.

## Architecture Decisions

| Decision                 | Choice                     | Rejected alternative                                                | Rationale                                                                                                                               |
| ------------------------ | -------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Move mechanism           | `git mv`                   | delete + recreate                                                   | Preserves blame/log history across the rename.                                                                                          |
| Sequencing               | One piece fully, then next | Batch all moves, then all import fixes                              | Tree stays buildable/testable after each piece; easy bisect.                                                                            |
| Barrel files             | None                       | Add `index.ts` per folder                                           | AGENTS.md use-case pattern intentionally omits the barrel; adding one creates a new inconsistency.                                      |
| `auth-errors` references | Do **not** touch them      | Update the 5 `@/domain/errors/auth-errors` refs + 2 JSDoc `@throws` | **Source `auth-errors.ts` does not move — only its test does.** The absolute alias stays valid; "updating" it would break correct code. |

### Correction to the proposal's edit count

The proposal states "12 external references + 2 JSDoc paths." That over-counts. Only the
**7 use-case alias references** actually change (the source files move). Every
`@/domain/errors/auth-errors` reference and JSDoc `@throws` path stays untouched because
`auth-errors.ts` keeps its location. Authoritative edits: **7 external alias updates + 4
relative-import fixes**, across **7 `git mv` operations**. `sdd-tasks`/`sdd-apply` must use
this corrected list.

## Move Sequencing (per-piece playbook)

For each use-case piece `X` in { `get-current-session`, `sign-in-with-google`, `sign-out` }:

1. `mkdir -p src/application/use-cases/X/__tests__`
2. `git mv src/application/use-cases/X.ts src/application/use-cases/X/X.ts`
3. `git mv src/application/use-cases/X.test.ts src/application/use-cases/X/__tests__/X.test.ts`
4. In the moved test, fix its relative import: `from "./X"` → `from "../X"`.
5. Update that piece's external consumers (see per-piece list below): append `/X` to the alias.
6. Verify: `npx tsc --noEmit` + `npm run test src/application/use-cases/X`.

Then piece 4, `auth-errors` (domain — **only the test moves**):

1. `mkdir -p src/domain/errors/__tests__`
2. `git mv src/domain/errors/auth-errors.test.ts src/domain/errors/__tests__/auth-errors.test.ts`
3. Fix the moved test's relative import: `from "./auth-errors"` → `from "../auth-errors"`.
4. No external consumer changes — `auth-errors.ts` did not move.
5. Verify: `npx tsc --noEmit` + `npm run test src/domain/errors`.

### Per-piece external consumers (the 7 alias updates)

| Piece               | Consumer (line)                                                          | Change                                                                |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| get-current-session | `src/app/page.tsx:4`                                                     | `…/get-current-session` → `…/get-current-session/get-current-session` |
| get-current-session | `src/app/page.test.tsx:25` (`vi.mock`)                                   | same                                                                  |
| get-current-session | `src/app/profile/page.tsx:6`                                             | same                                                                  |
| get-current-session | `src/app/profile/page.test.tsx:32` (`vi.mock`)                           | same                                                                  |
| sign-in-with-google | `src/infraestructure/actions/google-login.action.ts:7`                   | append `/sign-in-with-google`                                         |
| sign-in-with-google | `src/infraestructure/actions/google-login.action.test.ts:27` (`vi.mock`) | same                                                                  |
| sign-out            | `src/app/api/logout/route.ts:4`                                          | append `/sign-out`                                                    |

## File Changes

| File                                         | Action                                                              |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `src/application/use-cases/{X}.ts` (×3)      | Move → `{X}/{X}.ts`                                                 |
| `src/application/use-cases/{X}.test.ts` (×3) | Move → `{X}/__tests__/{X}.test.ts` + relative-import fix            |
| `src/domain/errors/auth-errors.test.ts`      | Move → `errors/__tests__/auth-errors.test.ts` + relative-import fix |
| 7 consumer files above                       | Modify — alias suffix update only                                   |

## Testing Strategy

No test-content change. The 4 relocated tests were already reviewed compliant (legacy
third-person titles deferred to a dedicated pass per AGENTS.md). Correctness is proven by the
existing suite passing unchanged after the move. Per-piece `tsc`/test checkpoints catch a
missed import immediately; final gate runs the full Definition of Done.

## Final Verification (Definition of Done)

`npm run lint` && `npx tsc --noEmit` && `npm run test` — all pass, zero behavior change.

## Migration / Rollout

No migration. Pure file moves on the feature branch; rollback = revert the PR / reset the branch.

## Open Questions

- None blocking. One resolved discrepancy: proposal's "12 refs + 2 JSDoc" corrected to
  **7 alias updates + 4 relative-import fixes** (auth-errors references stay put).
