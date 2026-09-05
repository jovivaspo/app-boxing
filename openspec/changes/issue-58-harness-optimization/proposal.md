# Proposal: Harness Enforcement

## Outcome — closed with reduced scope (2026-09-05)

Decisions D1–D5 and F2 below were discussed and resolved. Only two are actually implemented in
this change: **D1** (`.github/workflows/ac-explorer.yml` deleted) and **F2** (the `ponytail`
mandate dropped from `AGENTS.md:91`). Everything else — `paths-ignore` on `claude-pr-review.yml`,
the review iteration bound, the `no-restricted-imports` layering rules, the `AGENTS.md`
`.env.example`/`openspec/config.yaml` corrections, the `AGENTS.md` split (D2), the archive-commit
convention (D4), and F3/F9 (agent vendoring, archive-phase fix) — is deferred indefinitely: not
worth the effort right now. Issue #58 is closed on this basis; issue #59 (archive-phase cost
measurement) is closed alongside it, unimplemented. The decisions themselves stay recorded below
in case this is revisited later.

Issue: [#58 — Optimize harness project](https://github.com/jovivaspo/app-boxing/issues/58)
Depends on: `openspec/changes/issue-58-harness-optimization/exploration.md` — findings F1–F4 and
D1 corroborated by both Judgment Day judges; findings F5–F10 and decisions D2–D5 from a
single-source second pass covering the issue bullets the first audit did not frame.

## Intent

The harness is not broken — it is **unenforced and unversioned**. Rules live as prose in
`AGENTS.md`; almost nothing makes them true mechanically.

Concretely: every PR, including one that only moves markdown into `openspec/changes/archive/`,
summons a full Claude reviewer plus a Playwright explorer that boots the app (F1). `AGENTS.md:91`
mandates `ponytail`, but no hook loads it and the skill is not in the repository at all (F2).
Nothing bounds review iterations (F4).

The second pass extends the same diagnosis rather than changing it. Four rule families
(layering, the `@/` alias, folder patterns, test naming) are checked by nothing except a human
reading a PR — which is why PR review here is not simple (F8). Five statements across `AGENTS.md`,
`openspec/config.yaml` and the agent definitions are contradicted by the files they describe, and
memory is being used as an errata sheet for docs nobody goes back and fixes (F6). The archive
phase was told to _move_ a folder with a toolset that can only _copy_ (F9). And the repo has
committed archive docs both ways, with no convention (F10).

Success: each rule in scope is either enforced by a file in this repo, or corrected or removed in
the docs that claim it. No rule stays "documented, believed active, and absent" — and no document
keeps asserting something the repository contradicts.

## Scope

### In Scope

- **F1 (repo half)** — `paths-ignore` on `.github/workflows/claude-pr-review.yml` so
  markdown/`openspec/`-only PRs skip it. `ci.yml` keeps its unfiltered `pull_request:` trigger
  deliberately: it always reports, so it cannot deadlock a required check.
- **D1 resolved — drop e2e for now.** `.github/workflows/ac-explorer.yml` is deleted outright
  rather than filtered or pinned. No Playwright/e2e surface remains in the repo; `package.json`
  had no Playwright dependency to begin with, so this removes CI cost and a non-reproducible
  `@latest` pull, not a maintained capability.
- **F2 resolved — drop.** The `ponytail` mandate is deleted from `AGENTS.md:91` rather than
  vendored. No hook ever loaded it and it was never in the repo (F2), so this removes a false
  claim instead of building a skill and a hook extension to make it true.
- **F4** — a declared bound on `claude-pr-review.yml` (it sets no `--max-turns` today) so a review
  round cannot loop unbounded.
- **Archive completeness (design conclusion only)** — whatever shape the archive phase takes, its
  completeness check MUST be a command that fails loudly. A check a model self-reports is not a
  check.
- **F6 doc corrections (repo-local half)** — four falsifiable statements fixed at the source:
  `AGENTS.md`'s claim that `.env.example` is the committed template (`.gitignore:37` ignores it,
  and it has never been tracked), and the three stale assertions in `openspec/config.yaml`'s
  `context:` block (empty architecture folders, no tests, no `@testing-library/react`/`jsdom`,
  and `@/*` mapped to the project root instead of `./src/*`). That block is fed to every SDD
  phase, so it is the highest-leverage wrong text in the repo.
- **F7 ritual deletion** — remove `AGENTS.md`'s "ask the user whether to run `codegraph sync`"
  instruction. The watcher auto-syncs; asking a human a question a machine already answered is
  the exact manual ritual bullet 4 objects to. No hook replaces it.
- **F8 minimum** — add `npm run format:check` as a step in `ci.yml`. The script already exists in
  `package.json`; `lint-staged` only formats _staged_ files, so nothing catches format drift in
  files changed by any other path. One line, no dependency.
- **F8 layering, absolute half** — encode the two layering rules that have no exceptions in the
  prose, via ESLint core `no-restricted-imports` scoped per `files:` block: `domain/` imports no
  React/Next/Zod/fetch, and `application/` imports nothing from `infraestructure/` or `ui/`. No
  new dependency; same shape as the existing inline `local/no-comments` rule. The UI-layer rule
  is deliberately excluded — all three of `AGENTS.md`'s named exceptions live there and A1 in
  particular turns on intent (an overridable parameter with a module-level default), which an
  import matcher cannot see.

### Proposed, Not Settled

- **F3 — vendor `.claude/agents/` into the repo.** Today all 18 `sdd-*`/`jd-*`/`review-*`
  definitions live only in an unversioned `~/.claude/agents/`, so the issue bullet "improve the
  main agent orchestrator" has nowhere reviewable to land. Tradeoff: version-controlled and
  reproducible for a fresh clone versus 18 duplicated definitions that drift against the global
  install and must be maintained twice. Owner decision required before `sdd-tasks` schedules it.
- **F9 — the archive-phase fix, gated on F3.** `~/.claude/agents/sdd-archive.md` grants
  `Read, Edit, Write, Glob, mem_*, codegraph_explore` and **no Bash**, then instructs the agent to
  _move_ the change folder. With that grant a move is impossible; only a copy is. That is the
  mechanical cause of the observed copy-instead-of-move defect and of the `8m46s / ~102k tokens /
38 tool calls` cost — ten markdown files passed through a model, one read and one write each,
  to do what `git mv` does in one call. Its step 1 also reads prior artifacts from Engram, which
  `AGENTS.md` says is the wrong store for this project. Three small edits fix it: a scoped Bash
  grant for `git mv`, artifact reads pointed at `openspec/` files, and the mechanical completeness
  check replacing the self-reported `done`. Blocked only because the file lives outside the repo.
- **F5 — the `AGENTS.md` split (D2)** — the file is 224 lines and `CLAUDE.md` is one line,
  `@AGENTS.md`, an eager import. Splitting into topic files that are _also_ imported changes the
  token bill by roughly zero; the saving comes from which half stops being loaded by default. That
  boundary is a judgement about which rules an agent can break before it would think to look
  something up, so it is a decision, not a task. Note the second lever, which needs no split at
  all: every rule that becomes machine-enforced shrinks to one line of prose.
- **F10 resolved (D4)** — archive PR lands separately, after merge (option B). Recorded in
  `openspec/config.yaml`'s existing `rules.archive:` block and/or the `AGENTS.md` Commits section.
  No new file either way.

### Out of Scope

- **Any e2e / Playwright work** — decided against for now (D1); `ac-explorer.yml` is deleted
  rather than kept and fixed.
- **Archive-phase cost measurement and agent metrics** — issue #59.
- **Branch protection, required checks, rulesets** — GitHub server-side settings, not files
  (see Owner Action).
- **Already satisfied — dropped rather than reworked**: `openspec/config.yaml` exists with
  `persistence: openspec` and `strict_tdd: true`; `claude.yml` is `@claude`-gated and is not a
  cost source; `ci.yml`'s trigger is already correct; `openspec/changes/` is clean at HEAD (the
  copy-instead-of-move bug is history to prevent, not present state to repair).
- **New hooks** — rejected on analysis, not deferred. A `PostToolUse` lint hook duplicates
  `lint-staged`, which already `eslint --fix`es every staged `ts`/`tsx` at commit; a `SessionStart`
  `codegraph sync` automates a watcher no-op; nothing identified earns a `UserPromptSubmit` cost.
  F2 resolved as "drop", so bullet 4 needs no hook edit at all.
- **User-level files** — `~/.claude/CLAUDE.md` and the project memory index are outside this
  repository. Reported under Owner Action; no PR here can touch them.
- **A metrics or measurement system** — issue #59. This proposal adds no counters, no timers, no
  reporting surface.
- **Any new dependency or bespoke framework** — every mechanism above is an edit to a file that
  already exists, using tooling already installed.

## Owner Action Outside the Diff

1. **Branch protection (half of F1).** On GitHub, set branch protection for `main` with the
   `verify` job (`ci.yml`) as the sole required status check. Recorded here so it is not silently
   dropped when the file changes merge.
2. **Global rule revision (F6 item 4, D5).** `~/.claude/CLAUDE.md` states "Never use
   cat/grep/find/sed/ls. Use bat/rg/fd/sd/eza instead", but `bat` and `fd` exit 127 on this
   machine. This is not theoretical: the first-pass audit of _this change_ reported
   `openspec/config.yaml` missing because a `bat`-not-installed exit code was read as
   file-absent. Either install the tools or soften the rule; leaving it produces confident wrong
   findings.
3. **Memory-index hygiene (F6 item 5).** Entry 4 is marked `SUPERSEDED` and still indexed
   alongside entry 5 that supersedes it; entries 6 and 15 state the ponytail situation from
   opposite sides. Suggested standing convention, cheaper than any tooling: when a memory note
   records a doc contradiction, the doc is fixed in the same PR and the note is deleted rather
   than kept as errata.
4. **The `sdd-*` Engram contract (F6 item 3).** Every agent definition carries a
   `## Engram Save (mandatory)` section instructing a per-change `mem_save`, which `AGENTS.md`
   explicitly forbids for this project. One of the two must yield. Until it does, every SDD phase
   run in this repo begins by violating one of its two instruction sources.

## Decided — D1

Both judges agreed on the facts and split on the verdict. `ac-explorer.yml` wired
`@playwright/mcp@latest` and installed chromium in CI; `package.json` has no Playwright dependency
and no `playwright.config.*` exists.

- **Judge A**: Playwright MCP as an advisory, non-blocking PR check was fine as a role.
- **Judge B**: ephemeral `npx @latest` with no pin and no local config is not a maintainable e2e
  suite, and `@latest` makes CI non-reproducible.

**Owner call**: neither side — drop e2e entirely for now. `.github/workflows/ac-explorer.yml` is
deleted. This is not a pin-and-keep fix; there is no e2e surface left to reproduce or maintain.
Revisit if/when a maintainable, locally runnable suite is actually wanted.

## Decided — D4 (bullet 10): when the archive commit lands

The repo has done it both ways historically. `eca92b2` archived in a standalone `docs(sdd):`
commit; `8ddc5a0` carried two archive folders inside a feature commit; `8e9138e` was standalone
again. Owner comment 1 raised the fork explicitly.

**Owner call: option B — a separate archive PR after merge.** The archive always reflects merged
reality and the completeness check runs against the real post-merge tree, never a state that
might be reworked or rejected. Cost: a second PR per change — but with F1's `paths-ignore` in
place, that PR only triggers `verify` (lint + tsc + test, ~56s), not the full reviewer. The
reviewer-attention cost of one more PR to glance at remains, and is accepted.

Also weighed and rejected: keeping `openspec/` entirely untracked (never committed) so no archive
commit is ever needed. Rejected because 80 existing commits already version `openspec/` history,
`PULL_REQUEST_TEMPLATE.md:20-21` has reviewers cross-check PR Acceptance Criteria against
`openspec/changes/<change>/specs/*/spec.md`, and `config.yaml`'s `persistence: openspec` already
asserts the folder is the canonical, persisted store — untracking it would make that claim false,
the same disease this issue exists to cure.

What is _not_ a decision: staying ad hoc. Both patterns in history is the one option worse than
either branch, because neither a reviewer nor an agent can predict which shape a change will take.

## Decided — D2

The `AGENTS.md` split boundary (bullets 1 & 2). Stay inline (always loaded — edit-time safety):
Project, Tech Stack, Architecture/Hard Rules, Path Aliases, Code Style + Comments + Naming,
Security, Commits, Testing + Test Writing Rules, Codebase Indexing, SDD. Move to linked topic
files, loaded on demand: Environment Setup, Commands, Pull Requests, Tailwind CSS v4 Notes,
shadcn/ui Notes, Design.

## Decided — D3

How far the lint-rule shift-left goes (bullet 6). Only the two absolute layering rules ship as
lint (`no-restricted-imports`). The `should`-prefixed test-title rule and the `__tests__/`
placement rule are dropped, not deferred — PR review stays the enforcement point for both.

## Decided — D5

The user-level rule set (bullet 3). Owner Action items 2 (`bat`/`fd` not installed) and 3 (memory
index hygiene) are not editable from a PR against this repo, and stay that way: no repo-local
restatement, no fix attempted here. Recorded as Owner Action only.

## Capabilities

### New Capabilities

- `harness-enforcement`: CI trigger filtering, dropping the unenforceable ponytail mandate, review
  iteration bound, mechanical archive-completeness check, dependency-free lint enforcement of the
  absolute layering rules, and a CI format check.

### Modified Capabilities

- None.

## Approach

Independent, individually revertible edits — the smallest change that makes each rule
mechanically true, or that makes a false document true:

1. `paths-ignore` on `claude-pr-review.yml`; delete `ac-explorer.yml` outright (D1).
2. Vendor `ponytail` + wire both hooks (or delete the mandate).
3. Declared iteration bound on `claude-pr-review.yml`.
4. Mechanical archive-completeness check that exits non-zero.
5. Correct the four falsifiable statements: `AGENTS.md`'s `.env.example` claim and the three
   stale assertions in `openspec/config.yaml`'s `context:` block.
6. Delete `AGENTS.md`'s ask-before-`codegraph sync` ritual.
7. Add a `npm run format:check` step to `ci.yml`.
8. `no-restricted-imports` blocks for the two absolute layering rules in `eslint.config.mjs`.

Items 5–8 exist because of one worked precedent already in this repo: the comment ban stopped
being prose and became `local/no-comments`, a 25-line inline rule object, with zero new
dependencies. That is the model for every enforcement item here — no framework, no plugin, no
dependency, no metrics.

No new tooling, no new dependency, no `src/` change. Items 1–4 and 6–7 are trivially small; item
8 is the only one that can break a build on legitimate code, so it ships and is verified on its
own. Expected under the 400-line budget overall; F3 and the F9 fix it gates, if accepted, become
their own PR.

## Affected Areas

| Area                                     | Impact                | Description                                                                                            |
| ---------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| `.github/workflows/claude-pr-review.yml` | Modified              | `paths-ignore` + iteration bound                                                                       |
| `.github/workflows/ac-explorer.yml`      | Deleted               | D1 — e2e dropped, not filtered or pinned                                                               |
| `.github/workflows/ci.yml`               | Modified              | Adds a `npm run format:check` step; trigger deliberately stays unfiltered                              |
| `AGENTS.md:91`                           | Modified              | Ponytail mandate deleted (F2 — drop)                                                                   |
| `.claude/settings.json`                  | Modified              | Hooks load every mandated skill                                                                        |
| `AGENTS.md`                              | Modified              | `.env.example` correction, ask-before-sync ritual deleted; split per D2                                |
| `openspec/config.yaml`                   | Modified              | `context:` block corrected; `rules.archive:` gains the D4 convention — separate archive PR after merge |
| `eslint.config.mjs`                      | Modified              | `no-restricted-imports` for the two absolute layering rules only (D3)                                  |
| `.claude/agents/`                        | Deferred              | F3 — owner decision                                                                                    |
| `~/.claude/agents/sdd-archive.md`        | Deferred, out of repo | F9 — Bash grant, `openspec/` artifact reads, mechanical completeness check; gated on F3                |
| `~/.claude/CLAUDE.md`                    | Owner action          | Tool ban names uninstalled tools (D5)                                                                  |
| Project memory index                     | Owner action          | Superseded and duplicated entries (D5)                                                                 |
| GitHub branch protection                 | Owner action          | Outside the diff                                                                                       |

## Risks

| Risk                                                                                       | Likelihood                | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `paths-ignore` too broad — a spec-only PR skips the reviewer                               | Medium                    | Ignore list covers markdown/`openspec/` only; any `.github/`, `src/`, or `package.json` change re-arms `claude-pr-review.yml`                                                         |
| Vendored `ponytail` drifts from the global plugin version                                  | Medium                    | Vendored copy is authoritative for this repo; refresh is a normal PR                                                                                                                  |
| Iteration bound set too low, truncating a legitimate review                                | Low                       | Choose above precedent: the now-deleted `ac-explorer.yml` ran at `--max-turns 40`                                                                                                     |
| F3 accepted, then 18 duplicated agent files rot                                            | Medium                    | Deferred to an explicit owner decision, not bundled into round one                                                                                                                    |
| e2e is wanted again later, after `ac-explorer.yml` is gone                                 | Low                       | Rebuilding is a fresh addition, not a revert; nothing here blocks writing a pinned suite later                                                                                        |
| `no-restricted-imports` false-positives on legitimate code, blocking every commit          | Medium                    | Only the two rules with no exceptions in the prose are encoded; the UI rule and its three A1/A2 carve-outs are excluded by design. Ships as its own verifiable step, revertible alone |
| `npm run format:check` fails immediately on files never formatted (`.yml`, older markdown) | Medium                    | Run `npm run format` once in the same PR; the check is only meaningful once the tree is clean                                                                                         |
| Correcting `openspec/config.yaml`'s `context:` block changes what every SDD phase reads    | Low                       | The change replaces false statements with true ones; a phase acting on the corrected text is the point, not a side effect                                                             |
| Agents stop loading a rule they need because it moved to a linked file                     | Low                       | Only reference material moved (Env Setup, Commands, Pull Requests, Tailwind, shadcn, Design); every edit-time rule (layering, naming, comments, testing, commits) stays inline        |
| A second PR per change (archive) adds reviewer-attention overhead                          | Low                       | Accepted cost of D4; F1's `paths-ignore` already limits its CI trigger to `verify` alone                                                                                              |
| F9's fix lands only in `~/.claude/agents/`, drifts, and is lost on machine change          | High if F3 stays "global" | This is F3's whole argument; if F3 stays "keep global", accept that bullet 9's fix is unversioned and record it as such                                                               |
| Doc corrections land, then rot again                                                       | Medium                    | The corrections are one-off; the standing preventive is Owner Action 3 — fix the doc in the PR that discovers it instead of filing a memory note                                      |

## Rollback Plan

`rules.proposal` requires this for auth/session/OAuth risk; none is touched — no Google OAuth
flow, session cookie, or backend contract is in scope, and no application code changes.

Each item reverts as a single-file `git revert`: restoring the workflow triggers returns to
today's always-on behaviour; deleting the vendored skill returns to global-only resolution;
branch protection toggles back in GitHub settings. Worst case is a return to the current cost
profile, never a broken build — `verify` reports on every PR throughout.

## Dependencies

- **Blocking**: owner decision on F3 (vendor agents or not). F2 is resolved (drop).
- **Blocking the F9 archive-phase fix**: F3. The file lives outside the repo until then.
- Non-blocking: none. No npm dependency, no app config change.

## Success Criteria

- [ ] A docs/`openspec`-only PR runs `verify` and nothing else, observed on a real PR.
- [ ] A PR touching `src/` still runs `claude-pr-review.yml`.
- [ ] `ac-explorer.yml` no longer exists in `.github/workflows/`.
- [ ] A fresh clone either contains every skill `AGENTS.md` mandates, or `AGENTS.md` no longer
      mandates what is absent.
- [ ] The `SessionStart`/`SubagentStart` hooks reference every mandated skill.
- [ ] `claude-pr-review.yml` cannot exceed a declared iteration bound.
- [ ] Archive completeness is asserted by a command that exits non-zero when the move is
      incomplete — never by model self-report.
- [ ] `npm run lint`, `npx tsc --noEmit`, and `npm run test` still pass (no `src/` change).
- [ ] A file added under `src/domain/` that imports React, Next, Zod or `fetch` fails
      `npm run lint` — verified with a throwaway file, not by reading the config.
- [ ] A file under `src/application/` that imports from `@/infraestructure` or `@/ui` fails
      `npm run lint`, verified the same way.
- [ ] `npm run format:check` runs in CI and passes on a clean tree.
- [ ] `AGENTS.md` no longer claims `.env.example` is committed, and no longer tells the agent to
      ask before running `codegraph sync`.
- [ ] Every statement in `openspec/config.yaml`'s `context:` block is true at HEAD — specifically
      the architecture folders, the presence of tests, `@testing-library/react`/`jsdom`, and
      `@/*` → `./src/*`.
- [ ] A convention for when the archive commit lands exists in exactly one place
      (`rules.archive:` and/or `AGENTS.md`), and the next archived change follows it.
- [ ] No new npm dependency appears in `package.json`; `git diff` shows no new plugin, framework,
      or metrics surface.

## Proposal Question Round

Answer, correct, skip, or request another round. Two groups — the first was raised with the
original proposal and is still open; the second comes from the bullets the second pass added.
Answering any subset moves the proposal forward.

### Group 1 — from the first pass

1. **F2 direction** — **Answered.** Drop the mandate from `AGENTS.md`, not vendored.
2. **F3 boundary** — vendor all 18 agent definitions, only the `sdd-*` set, or keep them global?
   Assumed: undecided; blocked pending your call.
3. **D1** — **Answered.** Drop e2e for now; `ac-explorer.yml` deleted rather than pinned or kept
   advisory-only.
4. **Filter boundary** — should a PR touching only `openspec/` really skip the Claude reviewer?
   Spec changes drive code, so this is the sharpest edge of the cost saving. Assumed: yes, skip.
5. **Bound intent** — what failure is the iteration cap meant to prevent: runaway cost, or a
   review that never converges to mergeable? Assumed: runaway cost.

### Group 2 — from the second pass

6. **D4, archive commit timing** — **Answered.** Option B: a separate archive PR after merge,
   always reflecting merged reality.
7. **D2, what must be in every context** — **Answered.** Hard rules, layering, naming, comments,
   testing and commit rules stay inline; Environment Setup, Commands, Pull Requests, Tailwind,
   shadcn and the design link move to linked topic files.
8. **D3, how far to shift left** — **Answered.** Layering only. Test-title and `__tests__/`
   placement stay on PR review, not lint.
9. **The `sdd-*` Engram contract** — `AGENTS.md` forbids per-change SDD artifacts in Engram, every
   agent definition mandates a per-change `mem_save`. Which one yields? Assumed: `AGENTS.md` wins
   for this project and the agent contract is the thing to change, but this proposal cannot enact
   that until F3 is decided.
10. **Bullet 3 reach** — do you want the two user-level items (the tool ban naming uninstalled
    tools, and the memory-index hygiene) treated as your action items, or restated repo-locally so
    they become reviewable? Assumed: your action items; nothing outside the repo is edited here.
11. **F9 urgency** — the archive-phase fix is three small edits, but it is blocked on F3 because
    the file lives outside the repo. If F3 stays "keep agents global", do you want the fix applied
    anyway and accepted as unversioned, or left undone until there is a versioned home for it?
    Assumed: undecided; it stays blocked.
