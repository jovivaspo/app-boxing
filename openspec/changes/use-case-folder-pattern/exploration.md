# Exploration: use-case-folder-pattern

**Status:** partial
**Next recommended:** sdd-propose
**Date:** 2026-07-15
**Source:** GitHub Issue #8 — https://github.com/jovivaspo/app-boxing/issues/8

## Executive Summary

`src/application/use-cases/` is flat (6 files), exactly matching Issue #8's description — no drift since filing, no undocumented 4th use case. `src/domain/errors/auth-errors.test.ts` is confirmed present and flat, not yet moved. AGENTS.md's "Use case folder pattern" was confirmed to deliberately omit an `index.ts` barrel (unlike the component folder pattern) — the target structure is folder + file + sibling `__tests__/`, nothing else.

## Current State

```
src/application/use-cases/
├── get-current-session.ts / .test.ts
├── sign-in-with-google.ts / .test.ts
└── sign-out.ts / .test.ts
```

No `index.ts` barrel exists today. `src/domain/errors/auth-errors.ts` + flat `auth-errors.test.ts` both present.

## Affected Consumers (file:line)

**`@/application/use-cases/get-current-session`**

- `src/app/page.tsx:4`
- `src/app/page.test.tsx:25` (`vi.mock(...)`)
- `src/app/profile/page.tsx:6`
- `src/app/profile/page.test.tsx:32` (`vi.mock(...)`)

**`@/application/use-cases/sign-in-with-google`**

- `src/infraestructure/actions/google-login.action.ts:7`
- `src/infraestructure/actions/google-login.action.test.ts:27` (`vi.mock(...)`)

**`@/application/use-cases/sign-out`**

- `src/app/api/logout/route.ts:4`

**`@/domain/errors/auth-errors`**

- `src/application/use-cases/sign-in-with-google.ts:1` (+ comment-only JSDoc `@throws` refs at lines 13-14)
- `src/application/use-cases/sign-in-with-google.test.ts:3`
- `src/application/ports/auth.port.ts:6-7` (comment-only JSDoc `@throws` refs, not real imports)
- `src/infraestructure/actions/google-login.action.test.ts:6`
- `src/infraestructure/auth/backend-auth.adapter.ts:4`
- `src/domain/errors/auth-errors.test.ts` — relative `from "./auth-errors"` → must become `from "../auth-errors"` after the move

**Gotcha:** all 3 use-case test files import their subject via a relative path (e.g. `sign-in-with-google.test.ts` → `import { signInWithGoogle } from "./sign-in-with-google";`). A grep for `@/application/use-cases/...` alone won't catch these — once moved to `folder/__tests__/x.test.ts`, they must become `../x`.

`@/*` → `./src/*` is a directory-root wildcard in both `tsconfig.json` and `vitest.config.mts` — no config changes needed for the move itself.

## Approaches

1. **Straight mechanical move (per issue task list)** — move each pair into its own folder + `__tests__/`, fix the relative import inside each moved test, update the 12 external references enumerated above.
   - Pros: Matches the issue exactly, zero behavior change, low risk, consistent with the `sign-in-with-google/` example already in AGENTS.md.
   - Cons: Touches 12+ files in one commit.
   - Effort: Low.

2. **Move + add `index.ts` barrel per folder.**
   - Cons: Contradicts AGENTS.md, which deliberately omits the barrel for use cases — rejected.

## Recommendation

Approach 1, exactly as scoped by the issue. Order: (a) move files into new folders/`__tests__/`, (b) fix the one relative import per moved test, (c) update the 12 external references, (d) run lint/type-check/test.

## Risks

- 12 files touch an import path in one refactor — mechanical but easy to miss one, especially the two comment-only JSDoc `@throws` paths (non-breaking if stale, but inconsistent if left pointing at old paths).
- Relative-import gotcha inside the 3 moved test files (not caught by an `@/` grep).
- **Out-of-scope but adjacent:** `src/infraestructure/actions/google-login.action.ts` is itself still flat (not in a `google-login/` folder per the Server Action folder pattern), and several non-shadcn components under `src/ui/components/` (`login-card.tsx`, `login-header.tsx`, `login-footer.tsx`, `security-badges.tsx`, `card.tsx`, `separator.tsx`) are flat instead of kebab-case component folders. Same audit lineage as Issue #8, but out of its stated scope — recommend a follow-up issue rather than expanding this change.

## Ready for Proposal

Yes — issue is fully scoped, codebase matches the issue with no drift, all consumers enumerated, target pattern confirmed.
