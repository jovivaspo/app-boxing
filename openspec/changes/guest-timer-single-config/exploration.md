# Exploration: Guest Timer Single Config Simplification

Issue: #37 — refactor(timer): simplify guest timer to a single reusable, unnamed configuration
Engram topic: `sdd/guest-timer-single-config/explore`

## Current State

The guest (unauthenticated) timer flow currently provides:

1. **Multi-config storage** — localStorage holds an array of `TimerConfiguration` records, each with a unique `id` and required `name` field
2. **Full CRUD adapter** — `createLocalTimerConfigurationAdapter()` provides `create()`, `list()`, `getById()`, `update()`, `delete()` operations
3. **Migration pipeline** — When guest logs in, `migrateTimerConfigurations` Server Action runs as a fire-and-forget background effect, coordinated via Web Locks API to prevent duplicate migrations across tabs / React Strict Mode double-invokes
4. **Batch processing** — Migration caps at `MAX_MIGRATION_BATCH = 50` items
5. **Partial-failure semantics** — Failed items remain in localStorage for retry on next login; only successfully migrated ids are deleted
6. **Guest lookup/redirect** — `useGuestTimerConfigurationLookup` hook resolves guest timers by id, with not-found → redirect handling

This architecture is appropriate for power-user persistence (e.g., boxers with multiple training profiles), but guests typically only want to "try before you commit" — one quick timer.

## Affected Areas

**Files to remove entirely:**

- `src/infraestructure/actions/migrate-timer-configurations/migrate-timer-configurations.action.ts` — Server Action + Zod schema validation + batch logic
- `src/ui/components/timer-configuration-migration-runner/` — hook (Web Locks coordination) + component + tests
- `src/ui/hooks/use-guest-timer-configuration-lookup.ts` — guest by-id lookup + not-found/redirect logic + tests

**Files to significantly refactor:**

- `src/infraestructure/timer-configuration/local-timer-configuration.adapter.ts` — reduce from array CRUD to single-record read/write
- `src/ui/hooks/use-timer-configurations.ts` — guest branch no longer needs to manage multiple records
- `src/ui/components/timer-active/timer-active.hook.ts` — remove `useGuestTimerConfigurationLookup` call, simplify guest lookup
- `src/ui/components/timer-configuration-form/timer-configuration-form.hook.ts` — remove `useGuestTimerConfigurationLookup` call, simplify guest loading
- `src/app/page.tsx` — remove `TimerConfigurationMigrationRunner` import and JSX

**Minor updates (callers/tests):**

- `src/app/timers/new/page.tsx`, `src/app/timers/[id]/edit/page.tsx`, `src/app/timers/[id]/active/page.tsx` — guest behavior unchanged, no code edits needed
- Test files across all affected modules

## Open Question: Name Field Handling

`TimerConfiguration` model requires `name: z.string()`. Simplifying to a single guest timer raises the question: should the guest timer have a name?

### Approach 1: Placeholder Name (Recommended)

Use a fixed, user-facing placeholder like `"Mi Timer"` or `"Timer"`.

- **Pros:** minimal schema changes — `name` remains required on the domain model; backward compatible with backend API DTOs; domain validation (`validateTimerConfiguration`) unchanged; simple implementation — just a string constant in the local adapter; shows nicely in UI; no cascading changes to infrastructure layer.
- **Cons:** domain model contains slightly artificial data; all guests see identical name; doesn't explicitly signal to future readers that guest timer is unnamed; if guest transitions to authenticated, name follows to backend (benign but unintuitive).
- **Implementation sketch:** local adapter stores single timer under fixed key (e.g., `"guest-timer"` instead of `"timer-configurations"`); on read, timer object has `name: "Mi Timer"`; no schema changes; validation and mappers work as-is.

### Approach 2: Make Name Optional

Change domain/DTO schema to `name?: string`, default to empty string or undefined.

- **Pros:** semantically honest — guest timer has no user-assigned name; flexible for future named-vs-unnamed variants.
- **Cons:** breaks the domain model's current invariant (name is always present); requires schema changes at multiple layers (domain model, DTOs, Zod validators, mappers); backend API contract unknown — may require new endpoint or nullable field support; complicates authentication transition; form UI ("Nombre del Timer") becomes conditional/hidden for guests; existing tests that construct `TimerConfiguration` by hand all need updates.

### Approach 3: Separate GuestTimerConfiguration Type

Define a domain-level type for guest timer without `name` or `id`:

```typescript
interface GuestTimerConfiguration {
  rounds: number;
  roundDuration: number;
  restDuration: number;
  warnBeforeEnd: boolean;
  bellSound: boolean;
}
```

Stored in localStorage as a single record, mapped to full `TimerConfiguration` (with placeholder name) on load.

- **Pros:** semantically explicit — type name signals "this is the guest-only variant"; separate concerns; type safety prevents accidental multi-config code paths in guest flow.
- **Cons:** doubles domain types; mappers become more complex; requires new tests for guest-specific logic; use cases and hooks must handle two types or accept union/generic; moderate refactoring across application layer.

## Recommendation

**Use Approach 1 (Placeholder Name)** for these reasons:

1. Lowest effort, highest payoff — removes 90% of migration complexity with minimal schema churn
2. Ponytail principle — don't over-engineer; the guest experience is "try before commit," not "profile management"
3. Preserves invariants — domain model, validation, and backend contracts remain unchanged
4. Clear scope — all changes are in the guest storage/lookup paths; authenticated flows untouched
5. Testability — existing use case tests pass unchanged; only adapter + hook tests need updates

The guest timer displays and persists with placeholder name `"Mi Timer"`. If migration is ever re-enabled in the future, the backend receives a real timer with a sensible default name instead of null or undefined.

## Risks

1. **Breaking authenticated user timers during transition** — if an old guest-with-multiple-configs logs in AFTER this ships, their localStorage has an array but the new code expects a single record. Mitigation: add a one-time localStorage migration on app load that detects array format and discards/consolidates to single record.
2. **Test coverage gaps** — the migration runner's Web Locks coordination is well-tested; removing it removes those tests, but also the complexity they guard against. Ensure guest-path tests verify form create/edit/delete/run flow works.
3. **Storage key naming** — current key is `"timer-configurations"` (array). New single-record adapter should use a different key (e.g., `"guest-timer"`) to avoid reading/writing the old array by mistake.
4. **UI placeholder text** — form currently shows `required` attribute on name input and placeholder `"EJ. SACO PESADO"`. For guests, name input should be hidden or replaced with static display.

## Ready for Proposal

Yes. This exploration is complete and unblocked.

**Next phase:** sdd-propose to outline the exact scope, rollback plan, and acceptance criteria for the simplification.
