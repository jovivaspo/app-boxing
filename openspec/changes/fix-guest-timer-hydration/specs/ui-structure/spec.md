# Delta for UI Structure

## ADDED Requirements

### Requirement: Browser-Storage-Derived State Waits For Hydration

A UI hook that applies state derived from a browser-only store (e.g.
`localStorage`) to a component rendered on a statically prerendered or
server-rendered route MUST NOT apply that state until hydration has
completed. This determination MUST be made via one shared hook — not
reimplemented per consuming hook — so the server HTML and the first client
render agree by construction rather than by coincidence. `suppressHydrationWarning`
MUST NOT be used as a substitute for this gating.

#### Scenario: Storage-derived update gated behind the shared hydration hook

- GIVEN a UI hook reads a browser-only store and calls a state setter with the result
- WHEN that hook is implemented
- THEN the setter call MUST be gated behind the shared hydration-detection hook
- AND the setter MUST NOT run before hydration completes

#### Scenario: Multiple consumers share one hydration hook

- GIVEN two or more UI hooks each need to know whether hydration has completed
- WHEN they are implemented
- THEN they MUST all consume the same shared hydration-detection hook
- AND MUST NOT each define their own ad hoc hydration check

#### Scenario: No hydration-warning suppression as a workaround

- GIVEN a component renders browser-storage-derived state on a prerendered route
- WHEN the mismatch-avoidance approach is implemented
- THEN `suppressHydrationWarning` MUST NOT be used to mask the update
