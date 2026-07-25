# Timer Configuration Migration Specification

## Purpose

Defines the on-login migration of guest `TimerConfiguration` records held in
localStorage to the backend (Issue #20). Covers trigger point, per-item
backend creation, idempotency, partial-failure retention, blocking render,
silent operation, and graceful degradation. Builds on the
`timer-configuration-repository` port/adapters (Issue #19) without changing
them.

## Requirements

### Requirement: Migration trigger point

The system MUST attempt to migrate all locally stored `TimerConfiguration`
records automatically after a successful login, before the post-login
landing page renders its content.

#### Scenario: Local configurations exist at login

- GIVEN one or more `TimerConfiguration` records in localStorage
- WHEN the user completes login and lands on the post-login page
- THEN the system MUST attempt to migrate each record without user action

#### Scenario: No local configurations exist

- GIVEN localStorage has no `TimerConfiguration` records
- WHEN the user completes login
- THEN the system MUST render the landing page without attempting migration

### Requirement: Per-item backend creation

The system MUST create each local `TimerConfiguration` on the backend as a
new record, independently of the outcome of any other item.

#### Scenario: One local configuration is migrated

- GIVEN a local `TimerConfiguration` and a valid session
- WHEN migration runs
- THEN the system MUST create it on the backend as a new record

#### Scenario: One item's failure does not block another

- GIVEN two local `TimerConfiguration` records, one of which will fail to
  create on the backend
- WHEN migration runs
- THEN the system MUST still attempt and resolve the other record

### Requirement: Idempotent local cleanup

The system MUST remove a local `TimerConfiguration` only after its backend
creation succeeds, and MUST leave it untouched otherwise. Repeated logins
MUST NOT create duplicate backend records for the same originally-local
configuration.

#### Scenario: Successful item is cleared locally

- GIVEN a local configuration whose backend creation succeeds
- WHEN migration resolves that item
- THEN the system MUST remove it from localStorage

#### Scenario: Repeated login does not duplicate

- GIVEN a configuration already migrated and cleared on a previous login
- WHEN the user logs in again
- THEN the system MUST NOT create it on the backend a second time

### Requirement: Partial-failure retention

A local `TimerConfiguration` whose backend creation fails MUST remain in
localStorage, unchanged, so it can be retried on a future login.

#### Scenario: Failed item stays local

- GIVEN a local configuration whose backend creation fails
- WHEN migration resolves that item
- THEN the system MUST keep it in localStorage for a future attempt

### Requirement: No merge or conflict resolution

Migration MUST always create a new backend record and MUST NOT compare,
merge, or deduplicate a local configuration against any existing backend
configuration.

#### Scenario: Similar backend record already exists

- GIVEN a backend configuration with values matching a local configuration
- WHEN migration runs
- THEN the system MUST still create the local configuration as a new,
  separate backend record

### Requirement: Blocking render until resolution

The post-login landing page MUST NOT render its content until every local
`TimerConfiguration` present at login has resolved, whether by success or
failure.

#### Scenario: Migration still in progress

- GIVEN local configurations pending migration
- WHEN the landing page is requested
- THEN the system MUST withhold page content until all items resolve

### Requirement: Silent operation

Migration MUST NOT produce any user-visible feedback (toast, banner, or
notification) for either success or failure of any item.

#### Scenario: All items succeed

- GIVEN all local configurations migrate successfully
- WHEN migration completes
- THEN the system MUST NOT show any success indicator to the user

#### Scenario: Some items fail

- GIVEN one or more local configurations fail to migrate
- WHEN migration completes
- THEN the system MUST NOT show any error indicator to the user

### Requirement: Graceful degradation on missing token or unreachable backend

When the session token is unavailable or the backend cannot be reached, the
system MUST treat migration as deferred ("migrate later"): it MUST leave all
local configurations untouched and MUST NOT crash, hang, or block the
landing page from eventually rendering.

#### Scenario: No session token available

- GIVEN migration cannot obtain a valid session token
- WHEN migration is attempted
- THEN the system MUST leave all local configurations in localStorage and
  MUST still allow the landing page to render

#### Scenario: Backend unreachable

- GIVEN the backend does not respond to any create request
- WHEN migration is attempted
- THEN the system MUST leave all local configurations in localStorage and
  MUST still allow the landing page to render

### Requirement: Per-item outcome identification

The system MUST be able to determine, for each local configuration
submitted for migration, whether its individual backend creation succeeded
or failed, so that exactly the successful ones — and no others — are
removed from localStorage.

#### Scenario: Mixed outcomes are attributed correctly

- GIVEN two local configurations, one that succeeds and one that fails
- WHEN migration resolves both
- THEN the system MUST remove only the successful one from localStorage and
  MUST keep the failed one
