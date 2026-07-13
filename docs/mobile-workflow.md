# Mobile-Driven Claude Code Workflow

Guidance for driving this repo's Claude Code workflow (SDD phases, code reviews,
quick fixes) safely from the GitHub mobile app via `@claude` mentions in issues,
PRs, and reviews.

> **Status:** the workflow guard and `claude_args` scoping below are **proposed,
> not yet applied**. Claude Code's GitHub App cannot modify files under
> `.github/workflows/` (by design), so `claude.yml` must be edited manually by a
> repo maintainer. Everything else in this doc (command surface, remote-trigger
> evaluation) is informational and safe to follow today.

## 1. Current gap: no authorization check

`.github/workflows/claude.yml` triggers on `issue_comment`, `pull_request_review_comment`,
`issues`, and `pull_request_review` whenever the body contains `@claude` — with no
check on who posted it. Any user who can comment on an issue or PR can trigger a
run with `contents: read`, `pull-requests: read`, `issues: read`, and access to the
`CLAUDE_CODE_OAUTH_TOKEN` secret.

### Proposed guard

Add an `author_association` (or explicit login) check to the job's `if:` condition
so only the repo owner (or an allow-listed set of collaborators) can trigger a run:

```yaml
jobs:
  claude:
    if: |
      (
        (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
        (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
        (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
        (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
      ) &&
      (
        github.event.comment.author_association == 'OWNER' ||
        github.event.review.author_association == 'OWNER' ||
        github.event.issue.author_association == 'OWNER'
      )
```

`author_association == 'OWNER'` covers the repo owner regardless of GitHub
username changes. To allow specific additional collaborators, extend with
explicit login checks, e.g.:

```yaml
      (
        github.event.comment.user.login == 'jovivaspo' ||
        github.event.review.user.login == 'jovivaspo' ||
        github.event.issue.user.login == 'jovivaspo'
      )
```

Prefer `author_association == 'OWNER'` over a hardcoded login where possible —
it survives username changes and also covers org-owner scenarios.

## 2. Scoping `claude_args` for mobile-triggered runs

`claude.yml` currently leaves `claude_args` commented out (full default tool
access). For a mobile-triggered entry point, restrict destructive operations so
a phone-triggered run can never take an action that needs in-person review —
merges, force-pushes, and branch/tag deletion in particular:

```yaml
          claude_args: |
            --allowed-tools "Bash(git add:*),Bash(git commit:*),Bash(git status),Bash(git diff:*),Bash(git log:*),Bash(npm run lint),Bash(npm run test),Bash(npm run build),Bash(npx tsc --noEmit)"
```

This mirrors the "smart branch handling" the action already documents (push to
a new branch on issues, push directly on open PRs) while excluding
`git push --force`, `gh pr merge`, `git branch -D`, and similar irreversible
commands from the allow-list. The action's own PR-creation flow (via the
`Create a PR` link) is unaffected since it only requires `git push` to a new or
existing feature branch, never a merge.

## 3. Mobile command surface

These short-form `@claude` comment commands map to conventions already
documented in `AGENTS.md` and `openspec/config.yaml`. Use them from the GitHub
mobile app comment box on an issue or PR:

| Command                    | Maps to                                                                 |
| --------------------------- | ------------------------------------------------------------------------ |
| `@claude /sdd-continue`     | Advance the active OpenSpec change (`openspec/changes/<name>/`) to its next SDD phase (proposal → specs → design → tasks → apply → verify → archive), per `openspec/config.yaml` phase rules |
| `@claude /sdd-status`       | Summarize the status of the active `openspec/changes/*` entries — which phase each is in, what's pending in `docs/pending-tasks/pending-tasks.md` |
| `@claude /code-review`      | Run the `code-review-and-quality` skill's five-axis review (correctness, readability, architecture, security, performance) against the open PR's diff |
| Free-form instruction       | One-off fixes/questions, e.g. `@claude fix the failing test in PR #12` — Claude infers scope from the instruction and repo context as usual |

Notes:

- These are conventions for phrasing your comment, not registered slash
  commands in `claude.yml` — Claude reads the comment body and infers intent
  from the text, same as any other free-form request.
- For `/sdd-continue` and `/sdd-status`, Claude will look at
  `openspec/changes/` for the active (non-archived) change directory. If
  there's ambiguity (multiple active changes), Claude will ask which one to
  continue rather than guessing.
- `/code-review` only posts review feedback as a comment — per the action's
  existing capabilities, it cannot submit a formal GitHub PR review or approve
  a PR.

## 4. Remote triggers / routines (claude.ai mobile) — evaluation

For actions not tied to a specific GitHub event (e.g. a scheduled SDD status
check, or exploring a new idea without first opening an issue), a
[scheduled cloud agent](https://claude.ai) ("routine") triggered from the
Claude mobile app/web is a reasonable complementary channel:

- **Pros:** no GitHub event needed to kick off work; can run on a cron
  schedule (e.g. daily `/sdd-status` digest); doesn't require the repo owner to
  manually open an issue from mobile first.
- **Cons:** runs outside the `claude.yml` guard entirely, so any hardening
  applied there (author-association check, `--allowed-tools` scoping) must be
  re-applied at the routine level; results land wherever the routine posts
  them (not automatically as a PR/issue comment), so it's better suited to
  read-only status checks than to code changes.
- **Recommendation:** use `@claude` GitHub comments (this workflow) as the
  primary channel for anything that changes code or needs to be tied to a
  specific issue/PR. Reserve scheduled routines for read-only status checks
  (e.g. `/sdd-status` digests) where there's no destructive blast radius even
  without the `claude.yml` guard.

## 5. Manual verification checklist

Once the `claude.yml` changes from sections 1–2 are applied manually:

- [ ] Open a new issue from the GitHub mobile app containing `@claude status`.
- [ ] Confirm the Action does **not** run for a non-owner comment (test with a
      second account/collaborator if available).
- [ ] Confirm the Action **does** run for an owner comment/issue.
- [ ] Confirm Claude's run respects the `--allowed-tools` scope (e.g. attempts
      requiring `git push --force` are refused).
- [ ] Confirm results post back to the same GitHub comment, viewable from the
      mobile app.
