# Exploration — Harness optimization (issue #58)

Source: GitHub issue #58 "Optimize harness project", plus two owner comments.
Related: issue #59 (agent metrics).

Method: this exploration was produced by a Judgment Day dual blind review rather than a
single-pass read. Two independent read-only judges audited a frozen 17-file manifest of the
harness against the issue's ten bullets. Only findings both judges reached independently are
recorded as confirmed. Judge disagreement is recorded as an open decision, not resolved by
the orchestrator.

That first pass covered bullets 5, 7 and 8. A later single-source second pass covers bullets 1,
2, 3, 4, 6, 9 and 10 — see "Second pass" below, which states its own weaker provenance up front.

Audit base: HEAD `22450a9`; re-verified byte-identical at `419df09` (the manifest files are
unchanged across the PR #60 merge, so every finding below holds on the current base).

Native review facade returned `changed_files: 0, risk: low, lenses: []` — the working tree was
clean, so this is an audit of committed state, not a candidate diff. That typed result is
preserved rather than treated as a passing review.

## Central finding

The harness is not broken. It is **unenforced and unversioned**. Nearly every rule exists as
prose in `AGENTS.md`, and almost nothing makes it true mechanically. The gap between "what the
docs say the harness does" and "what the files actually enforce" is the thing this change
should close.

## Confirmed by both judges

### F1 — Both expensive workflows fire on every PR, with no path filter

`.github/workflows/claude-pr-review.yml:3-5` and `.github/workflows/ac-explorer.yml:9-11`:

```yaml
on:
  pull_request:
    types: [opened, synchronize]
```

`rg 'paths' .github/workflows/` returns nothing. A docs-only PR — including one that only
moves markdown into `openspec/changes/archive/` — summons a full Claude code reviewer plus a
Playwright explorer that boots the app.

Owner comment 1's cost analysis is accurate as written.

### F2 — The `ponytail` mandate has no mechanical enforcement, and the skill is not in the repo

`AGENTS.md:91` declares both `caveman` and `ponytail` mandatory for every task. The only
enforcement is `.claude/settings.json`, which wires `SessionStart` and `SubagentStart`
(matcher `*`) to hook scripts that read exactly one file: `skills/caveman/SKILL.md`. Neither
hook references ponytail.

Beyond what the judges reported: `ponytail` is not vendored into `.claude/skills/` at all.
That directory contains caveman, clean-code, code-review-and-quality, nextjs-16-complete-guide,
react-expert, react-testing-library, typescript-advanced-types, vitest, zod-4 — nine skills,
no ponytail. `AGENTS.md` mandates a skill the repository does not contain; it resolves only
from a developer's global plugin installation. A fresh clone, a new contributor, or a CI
runner has no ponytail whatsoever.

This is the sharpest instance of the central finding: a rule that is documented as mandatory,
believed to be active, and in fact absent from the artifact that defines the project.

### F3 — No `.claude/agents/` in this repository

Glob `.claude/agents/**` returns no files. All eighteen agent definitions this project
actually uses (`sdd-*`, `jd-*`, `review-*`) live only in the developer's global, unversioned
`~/.claude/agents/`.

Direct consequence for the issue bullet "analyse if it's possible modifying and improving the
main agent orchestrator": there is currently no repo-local, version-controlled, PR-reviewable
place for that work to land. Any orchestrator improvement made today is invisible to the
repository and unreproducible for anyone else.

### F4 — The anti-infinite-loop bullet is entirely unimplemented

No iteration cap, no required-status-check configuration, no `CODEOWNERS`, no ruleset file
anywhere in `.github/`. `claude-pr-review.yml` sets no `--max-turns`. `ac-explorer.yml:199`
sets `--max-turns 40`, but that bounds a single job step, not review iterations across a PR.

Neither half of owner comment 1's proposal exists in the repo yet.

## Confirmed context (no action forced)

- **`ci.yml` is a sound choice for the sole required check.** The job is literally named
  `verify` (`ci.yml:8-9`) and runs on a bare `pull_request:` trigger with no path filter.
  Because it always reports, it cannot deadlock branch protection the way a path-filtered
  required check would. Owner comment 1's reasoning holds.
- **`claude.yml` is not part of the cost problem.** It fires only on `issue_comment`,
  `pull_request_review_comment`, `issues`, and `pull_request_review`, gated by
  `contains(..., '@claude')`. Excluding it from the expensive-workflow list was correct.
- **The issue-46 archive is clean at HEAD.** `openspec/changes/` holds only `README.md`;
  `archive/2026-08-20-issue-46-landing-page/` holds ten files. The copy-instead-of-move bug
  from owner comment 2 is real history but is not reproducible from current bytes. It is a
  process defect to prevent, not a present-state defect to repair.
- **`openspec/config.yaml` exists** with `persistence: openspec` and `strict_tdd: true`,
  matching `AGENTS.md:205`. An earlier orchestrator check wrongly reported it missing (a
  `bat`-not-installed exit code misread as file-absent); both judges corrected this.

## Open decision — judges contradict

### D1 — Playwright: already solved, or still a gap?

Both judges agree on the facts and disagree on the verdict.

Facts, uncontested:

- `ac-explorer.yml:140-142` wires `@playwright/mcp@latest` via `npx -y --isolated`
- `ac-explorer.yml:78` runs `npx --yes playwright install --with-deps chromium`
- `package.json` has no playwright dependency; no `playwright.config.*` exists in the tree

Judge A: the bullet is already answered. Playwright MCP is wired and running as an advisory,
non-blocking PR check, exactly as the file's own header comment describes.

Judge B: it is a gap. Ephemeral CI-only `npx @latest` with no pinned version and no local
config is not a maintainable e2e suite, and `@latest` makes CI non-reproducible.

This needs an explicit product decision before any task touches e2e. Escalated, not resolved.

## Second pass — bullets 1, 2, 3, 4, 6, 9, 10

**Provenance, read this first.** Everything above (F1–F4, D1) came from the Judgment Day dual
blind review and is corroborated by two independent judges. Everything in _this_ section is
single-source: it was produced by a follow-up pass, not by the judges. The reason for the gap is
recorded here so it is not repeated — the original audit brief aimed the judges at file-level
defects ("what is ACTUALLY TRUE IN THE FILES, not what would be nice to build"). Six of the ten
issue bullets ask for analysis and design rather than defect-finding, so they were structurally
out of frame.

Every **Fact** below is quoted from a file at the current base. Every **Assessment** and **Open
question** is judgement, and is labelled as such. Bullet numbering follows the issue.

### F5 — bullets 1 & 2: `AGENTS.md` is one 224-line file, and splitting it saves nothing by itself

Facts:

- `AGENTS.md` is 224 lines covering, in one file: project intro, tech stack, Clean/Hexagonal
  architecture, hard rules A1/A2, path aliases, code style, the comment ban, file and folder
  naming, environment setup, security, commands, commits, pull requests, testing, codebase
  indexing, SDD, Tailwind v4 notes, shadcn notes, and a design link.
- `CLAUDE.md` consists of exactly one line: `@AGENTS.md`. That is an eager import — the whole
  file enters the context of every session and every subagent, on every task, whether the task
  is a Tailwind tweak or a docs move.

Assessment: the bullet's stated goal (topic files) is only a win if the extracted files stop
being loaded eagerly. Replacing one `@AGENTS.md` import with six `@docs/*.md` imports moves text
between files and changes the token bill by roughly zero. The saving comes from the split
_boundary_, not from the split:

- **Always-loaded** — the rules an agent can violate in its first edit: hard rules, layering,
  naming, comments, testing rules, commits.
- **On-demand, linked not imported** — reference material consulted only when the task touches
  it: Tailwind v4 notes, shadcn notes, environment setup, commands, the design link, SDD detail.

Second lever, and it points at bullet 6: a rule that is machine-enforced needs one line of prose,
not twelve. The `Comments` section spends twelve lines describing behaviour that
`eslint.config.mjs` already fails the build on. Every rule moved from prose to a lint rule shrinks
the always-loaded half.

Open question (D2): where the always-loaded / on-demand line falls. That is a judgement about
which rules an agent can break before it would ever think to go look something up.

### F6 — bullet 3: the rule surfaces contradict each other, and memory is being used as an errata sheet

Five contradictions, all verified at the current base:

1. **`.env.example`.** `AGENTS.md` says "Copy `.env.example` to `.env`" and "`.env.example` is
   the committed template". `.gitignore:37` is `.env*` and the only negation is
   `!.env.local.example` — so `.env.example` is ignored and has never been tracked. Memory entry
   11 already records this exact contradiction. The memory note was written; the doc was never
   corrected.
2. **`openspec/config.yaml`'s `context:` block is stale on four counts.** It states the
   Clean/Hexagonal folders are "present and empty" (they are populated), "no test files written
   yet" (many exist), "No @testing-library/react or jsdom installed" (`package.json` has
   `@testing-library/react ^16.3.2` and `jsdom ^29.1.1`), and "Path alias `@/*` -> project root"
   (`tsconfig.json:22` maps `@/*` to `./src/*`). That block is fed to every SDD phase.
3. **SDD persistence.** `AGENTS.md` states `openspec/` is the sole canonical store and that
   per-change SDD artifacts MUST NOT be persisted to Engram. Every `sdd-*` agent definition
   carries a `## Engram Save (mandatory)` section instructing the opposite —
   `~/.claude/agents/sdd-archive.md:33-40` mandates `mem_save` of the archive report, and its
   step 1 reads every prior artifact via `mem_search` rather than from `openspec/` files.
4. **Global tool ban names tools that are not installed.** `~/.claude/CLAUDE.md` states "Never
   use cat/grep/find/sed/ls. Use bat/rg/fd/sd/eza instead." `bat` and `fd` both exit 127 on this
   machine. This is not hypothetical harm: the first-pass audit of this very change reported
   `openspec/config.yaml` as missing because a `bat`-not-installed exit code was read as
   file-absent (see "Confirmed context" above). A rule that cannot be obeyed as written produces
   confident wrong findings.
5. **Memory index carries dead and duplicated entries.** Entry 4 is marked `SUPERSEDED` and still
   occupies the index alongside entry 5 that supersedes it. Entries 6 and 15 describe the same
   ponytail fact from opposite sides — 6 says both skills are required every task, 15 says
   ponytail is in no hook and not vendored.

Assessment: the pattern across 1, 2 and 5 is the same — memory is functioning as an errata sheet
for documents nobody goes back and fixes. That is strictly worse than either alternative, because
the wrong statement stays loaded in every context while the correction sits in a store that is
only read when someone thinks to search for it.

Cheap direction, no new tooling: correct the falsifiable statements at the source, delete the
superseded memory entry, and adopt one convention — when a memory note records a doc
contradiction, the doc is fixed in the same PR and the note is deleted rather than kept.

Scope note: items 1, 2 and 5 are repo-local or user-local files this change can touch. Item 4 is
in `~/.claude/CLAUDE.md`, outside the repository; it is reported, not edited. Item 3 is F9 and
F3's territory.

### F7 — bullet 4: the hook surface is two caveman reminders, and most hook ideas duplicate husky

Facts: `.claude/settings.json` has exactly two hooks — `SessionStart` (matcher
`startup|resume|clear|compact`) and `SubagentStart` (matcher `*`), both invoking caveman reminder
scripts. There is no `PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`, or `UserPromptSubmit`
hook. The only other top-level key is `permissions`.

Assessment, candidate by candidate. Most fail the "does this need to exist" test:

| Candidate hook                                      | Verdict                                                                                                                                                                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load every mandated skill at session/subagent start | Worth it — this is F2, already in scope. No new hook, an edit to the two that exist.                                                                                                                                                                                  |
| `SessionStart` runs `codegraph sync`                | Probably unnecessary as a hook. The watcher auto-syncs; `AGENTS.md` nonetheless tells the agent to _ask the user_ whether to sync. That question is the bullet's own example of a manual ritual, and the honest fix is to delete the ritual, not to automate a no-op. |
| `PostToolUse` lints the file just edited            | Skip. `.husky/pre-commit` → `lint-staged` already runs `eslint --fix` on every staged `ts`/`tsx`. A per-edit hook pays the cost on every edit to catch what is caught once at commit.                                                                                 |
| `Stop`/`SubagentStop` asserts archive completeness  | The _check_ is already in scope as a command that exits non-zero. Whether a hook invokes it is an implementation detail, not a separate proposal.                                                                                                                     |
| `UserPromptSubmit` injecting context                | Nothing identified that earns its per-prompt cost.                                                                                                                                                                                                                    |

Net: bullet 4 produces one edit that is already scoped (F2) and one deletion (`AGENTS.md`'s
ask-before-sync ritual). "Add automatic hooks" is the sprawl invitation in this issue; the
defensible answer is that the existing husky and lint-staged gates already occupy most of the
ground a hook would claim.

### F8 — bullet 6: four rule families are unenforceable anywhere except a human PR review

Facts. Local gates today: `.husky/pre-commit` → `npx lint-staged` (`eslint --fix` on
`js,jsx,ts,tsx`; `prettier --write` on `js,jsx,ts,tsx,json,css,md`), and `.husky/pre-push` →
`npx tsc --noEmit && npm run test`. CI (`ci.yml`) re-runs lint, type-check and tests. So lint,
types, formatting-on-staged-files and tests are all caught before a PR exists.

Not machine-checked anywhere, in any gate:

- the Clean/Hexagonal layering rules (domain imports no framework; application imports no
  infrastructure or UI; UI depends on ports with three named exceptions)
- the `@/` import-alias rule ("never use relative paths across layer boundaries")
- the per-piece folder patterns and `__tests__/` sibling placement
- the `should`-prefixed test-title rule and "one behavior per test"
- "presentational components are not tested"

These surface only in PR review — which is precisely why PR reviews on this repo are not simple,
the complaint the bullet opens with.

The repo already contains the worked example of the fix: the comment ban used to be prose, and is
now `local/no-comments`, a 25-line rule object defined inline in `eslint.config.mjs` with **zero
new dependencies**. That is the whole mechanism this bullet needs — not a framework.

Assessment, cheapest mechanism per family:

| Rule family                       | Mechanism                                                                               | New dependency |
| --------------------------------- | --------------------------------------------------------------------------------------- | -------------- |
| Layering + `@/` alias             | ESLint core `no-restricted-imports`, scoped per `files:` block                          | none           |
| `should`-prefixed titles          | Inline `local/*` rule reading the first argument of `it`/`test` under `**/__tests__/**` | none           |
| Folder / `__tests__` placement    | Inline `local/*` rule reading `context.filename`                                        | none           |
| Format drift outside staged files | Add `npm run format:check` to `ci.yml`; the script already exists in `package.json`     | none           |

Open question (D3): which of these to actually add, and in which order. Layering is the highest
review cost today and the most objective. "Presentational components are not tested" is the one
family with no cheap mechanical form — a rule that resists cheap enforcement is a rule worth
re-reading before enforcing.

### F9 — bullet 9: the archive agent's cost and its copy-instead-of-move bug have one mechanical cause

Facts, from `~/.claude/agents/sdd-archive.md`:

- frontmatter `model: haiku`
- frontmatter `tools: Read, Edit, Write, Glob, mcp__plugin_engram_engram__mem_search,
mcp__plugin_engram_engram__mem_get_observation, mcp__plugin_engram_engram__mem_save,
mcp__codegraph__codegraph_explore` — **no Bash**
- step 1 reads every prior artifact through `mem_search` / `mem_get_observation`
- steps 2 and 3 instruct it to "merge delta specs" and "move change folder to archive"
- the Result Contract's only completion signal is a self-reported `status: done`

Assessment. Without Bash there is no `git mv` and no delete. The agent is instructed to _move_ a
folder using a toolset that can only _copy_: read each file, write it at the new path, and leave
the original because nothing in its toolset can remove it. The observed defect from owner comment
2 — folder copied rather than moved, while the agent self-reported `done` — is therefore not a
model lapse to be fixed with better prompting. It is the tool grant. The same grant explains the
cost: `8m46s / ~102k tokens / 38 tool calls` is what it costs to pass ten markdown files through
a model, one read and one write each, to accomplish what `git mv` does in one call.

Compounding it, step 1 sends the agent to Engram for artifacts that `AGENTS.md` says live only in
`openspec/` files (F6 item 3), so the phase begins by searching the wrong store.

So the answer to "is it possible to improve the main orchestrator" is yes, and the improvement is
small and specific rather than architectural: grant the archive phase a scoped Bash for `git mv`,
point its artifact reads at `openspec/` files, and replace the self-reported completion with the
mechanical check already in scope. No new framework, no new agent, no metrics — the measurement
side stays in issue #59.

The blocker is unchanged: F3 says there is no repo-local `.claude/agents/`, so today this fix has
nowhere version-controlled to land. Bullet 9 is executable only if F3 resolves as "vendor".

### F10 — bullet 10: the archive-commit convention does not exist, and the repo has done it both ways

Facts, from `git log --diff-filter=A` over archive folders:

- `eca92b2 docs(sdd): archive timer-activo-engine change` — standalone docs commit
- `8ddc5a0 integrate duration components into guest-timer & timer-configuration forms (issue #43)
(#47)` — two archive folders rode along inside a feature commit
- `8e9138e docs: archive the issue-46 landing page change` — standalone again

Owner comment 1 raises the fork explicitly: let the archive commit ride with the feature PR, "at
the cost of archiving before the change is actually merged".

Assessment: the current state — ad hoc, both patterns in history — is the one option that is
worse than either branch of the fork, because neither a reviewer nor an agent can predict which
shape a given change will take. Something must be chosen; _what_ is chosen is a genuine decision
with real cost on both sides (D4 below).

Landing place, if it helps the decision: `openspec/config.yaml` already has a `rules.archive:`
block (currently one line, "Warn before merging destructive deltas"). A convention lands there,
and/or in the `AGENTS.md` Commits section. No new file is needed either way.

## Additional open decisions

### D2 — the `AGENTS.md` split boundary (bullets 1 & 2)

Splitting into topic files is only a token win if the extracted files are _linked_, not
`@`-imported; `CLAUDE.md`'s `@AGENTS.md` is eager. So the decision is not "split or not" but
"which rules must be in every context by default".

- **Split aggressively (most content linked, loaded on demand):** smallest per-turn context.
  Cost: a rule an agent never loads is a rule an agent breaks, and it will not know to go look.
- **Keep the hard rules inline, link only reference material:** safe, modest saving.
- **Do nothing:** zero risk, zero saving, and the file keeps growing.

Not resolved. Requires the owner's view on which rules are load-bearing at edit time.

### D3 — which prose rules become lint rules (bullet 6)

All four mechanisms in F8 are dependency-free and follow the existing `local/no-comments`
pattern, but each is still code that must be maintained and can produce false positives on
legitimate code. Adding all four at once is the over-build; adding none leaves PR review carrying
them. The order and the cut-off are the owner's call.

### D4 — when the archive commit lands (bullet 10) — a real fork

- **A: archive rides in the feature PR.** One PR, one review, no docs-only PR at all — which also
  removes the very PR class that F1's `paths-ignore` exists to make cheap. Cost: the change is
  archived as complete before `main` has it. If the PR is reworked or rejected, the archive
  records a state that never existed, and "verified" is claimed against unmerged code.
- **B: a separate archive PR after merge.** The archive always reflects merged reality, and the
  completeness check runs against the real post-merge tree. Cost: a second PR per change, and it
  is exactly the docs-only PR that costs CI money and reviewer attention.

One honest interaction between the two, offered as analysis and not as a verdict: if F1's
`paths-ignore` ships, option B's CI cost falls to `verify` alone, which removes most of B's
stated downside. The reviewer-attention cost remains.

Not resolved.

### D5 — the global rule set is outside this repository (bullet 3)

`~/.claude/CLAUDE.md` and `~/.claude/projects/.../memory/MEMORY.md` are user-level files. F6's
findings about them are reported, not actionable inside a PR against this repository. Whether the
owner revises them, and whether any of it should be restated repo-locally where it is reviewable,
is the owner's decision — the same shape as F3.

## Deferred to issue #59

Owner comment 2 measured the `sdd-archive` phase at 8m46s, ~102k tokens, 38 tool calls, for
work that is mostly deterministic file movement — and which still did not complete correctly
(folder copied, not moved, while the agent self-reported `status: done`).

The measurement itself belongs to #59. The design conclusion belongs here: **a completeness
check that a model self-reports is not a check.** Whatever shape the archive phase takes, its
verification must be mechanical and must fail loudly.

## Scope boundaries

Four findings cannot be fixed by editing this repository alone:

- **F1's branch-protection half** lives in GitHub server-side settings, not in any versioned
  file. The `paths-ignore` half is a repo change; the required-check half is a settings change
  the owner must make.
- **F3** requires deciding whether to vendor global agents into the repo, which is a
  workflow-ownership decision, not a mechanical move.
- **F9** (the archive agent's missing Bash grant and its Engram-versus-`openspec/` artifact
  reads) edits `~/.claude/agents/sdd-archive.md`, which exists only outside the repository. It
  becomes repo-local work if and only if F3 resolves as "vendor".
- **F6 item 4** (`~/.claude/CLAUDE.md`'s ban on tools that are not installed) and the memory-index
  hygiene items are user-level files — reported here, not editable in a PR against this repo.
  See D5.

The remaining work is repo-local and versionable: the `paths-ignore` edits, the skill vendoring
and hook wiring, the iteration bound, the mechanical archive check, the doc corrections in F6
items 1 and 2, the lint rules in F8, and whichever archive-commit convention D4 selects.
