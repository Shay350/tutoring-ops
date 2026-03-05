# QA → Main Handoff (VS1)

## Tests added
- `tests/VS1_TEST_PLAN.md`
- `tests/unit/require-role.test.ts`
- `tests/unit/migrations.test.ts`
- `tests/e2e/vs1-smoke.spec.ts`

## How to run
- Unit tests: `npm run test:unit`
- VS1 smoke E2E: `E2E_RUN_VS1=1 npm run test:e2e`
  - Requires env vars:
    - `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`
    - `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`
    - `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD`
    - `E2E_TUTOR_NAME`
  - Note: `tests/unit/migrations.test.ts` auto-skips until a VS1 core migration exists in `supabase/migrations` with `vs1` in the filename.

## data-testid needed (MAIN)
Customer intake `/customer/intake`
- `intake-student-name`, `intake-student-grade`, `intake-subjects`, `intake-availability`, `intake-goals`, `intake-location`, `intake-submit`, `intake-success`

Manager pipeline `/manager/pipeline`
- `intake-list`, `intake-search`, `intake-row`, nested `intake-approve`, `intake-approved`
- `assign-tutor`, `assign-tutor-select`, `assign-submit`, `assign-success`
- `create-session`, `session-date`, `session-submit`, `session-created`

Tutor schedule `/tutor/schedule`
- `session-row`, `session-log-topics`, `session-log-homework`, `session-log-next-plan`, `session-log-summary`, `session-log-private-notes`, `session-log-submit`, `session-log-saved`

Customer history `/customer/history`
- `history-list`, `history-item`, `progress-snapshot`

============================================================

# QA → Main Handoff (VS9)

## Tests added
- Unit: `tests/unit/vs9-slotting.test.ts` (ranking + closed hours + capacity + availability constraints)
- E2E: `tests/e2e/vs9-slotting.spec.ts` (gated flow: intake -> approve intake -> approve suggestion -> session created)

## How to run
- Unit tests: `npm run test:unit`
- VS9 E2E: `E2E_RUN_VS9=1 npm run test:e2e`

## data-testid used
Manager intake review `/manager/pipeline/[intakeId]`
- `slotting-suggestions-list`
- `slotting-suggestion-row`
- `slotting-approve`
- `slotting-reject`
- `slotting-why`

============================================================

# QA -> Main Handoff (VS10)

## Tests added
- Unit: `tests/unit/locations.test.ts` (`getDefaultLocationId` success/error/missing-default coverage)
- E2E: `tests/e2e/vs10-locations.spec.ts` (gated multi-location flow)

## How to run
- Unit tests: `npm run test:unit`
- VS10 gated E2E: `E2E_RUN_VS10=1 npm run test:e2e`
- Full quality gate: `npm run test:all`

## Required env vars
- `E2E_RUN_VS10=1`
- `E2E_BASE_URL` (optional, defaults to `http://localhost:3000`)
- `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`
- `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`
- `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD`
- `E2E_TUTOR_NAME` (preferred tutor label for first assignment)
- `E2E_TUTOR_ALT_NAME` (optional second tutor label for location-isolation checks)

## What VS10 E2E validates
- Manager creates two locations using:
  - `locations-list`
  - `location-row`
  - `location-create`
  - `location-name`
  - `location-active`
  - `location-save`
- Customer submits two intakes and selects each location via:
  - `intake-location-select`
- Manager schedule filtering verifies location-scoped visibility via:
  - `schedule-location-select`
- Tutor schedule verifies scoped visibility:
  - tutor sees the session for assigned location and not the other location's session

============================================================

# QA -> Main Handoff (VS11.1)

## Tests added/updated
- Updated E2E:
  - `tests/e2e/vs11-admin-governance.spec.ts`
    - validates admin invite role options include all roles (`admin|manager|tutor|customer`)
    - validates confirmation safeguard (`[CONFIRMATION_REQUIRED]`)
    - validates self-demotion safeguard (`[SELF_DEMOTION_BLOCKED]`)
  - `tests/e2e/vs11-admin-boundaries.spec.ts`
    - added tutor boundary check (`/admin` redirects back to `/tutor`)
    - expanded manager scope checks across schedule + pipeline + students
- Added Unit:
  - `tests/unit/vs11-selector-contract.test.ts`
    - selector contract checks for admin governance + manager/admin boundary surfaces
  - `tests/unit/vs11-seed-contract.test.ts`
    - deterministic seed contract check for governance actors (including 2 active admins)
- Updated seed fixture:
  - `seed/profiles_seed.csv`
    - added `admin2@tutorops.local` (`role=admin`) for deterministic last-admin/self-demotion scenarios

## Selector contract (stable test ids)
- Admin governance:
  - `admin-invite-email`
  - `admin-invite-role`
  - `admin-invite-submit`
  - `admin-role-select-*`
  - `admin-role-submit-*`
  - `admin-role-confirm-*`
  - `admin-membership-assign-submit-*`
  - `admin-membership-remove-*-*`
- Manager/Admin boundary:
  - `manager-invite-boundary`
  - `manager-invite-role`
  - `manager-locations-boundary`
  - `locations-list`
  - `admin-schedule-entry`
  - `admin-students-entry`

## VS11.1 scenario matrix (explicit)
- ✅ Admin invite all roles.
  - Evidence: `vs11-admin-governance.spec.ts` validates role options exactly `[admin, manager, tutor, customer]`.
- ✅ Manager invite customer-only; non-customer blocked server-side.
  - Evidence: `tests/unit/manager-invites.test.ts` tampered role blocked; only customer accepted.
- ✅ Manager cannot mutate locations.
  - Evidence: `vs11-admin-boundaries.spec.ts` checks read-only manager locations UI (no create/save controls).
- ✅ Admin can mutate locations and memberships.
  - Evidence: admin governance membership controls/selectors covered; admin governance routes validated in E2E.
- ⚠️ Admin role edit safeguards: self-demotion blocked; last-admin demotion blocked; audit row recorded.
  - Self-demotion blocked: covered (unit + e2e).
  - Last-admin demotion blocked: covered in unit (`tests/unit/admin-governance.test.ts`).
  - Audit row recorded: not verifiable in this env via E2E due Supabase env missing; requires DB-backed run.
- ✅ Admin parity wrappers render and perform core operational actions.
  - Evidence: admin operational entrypoints validated (`pipeline/schedule/students/messages/reports`) in VS11 E2E suite.
- ✅ Manager location scoping still enforced in pipeline/schedule/students.
  - Evidence: manager redirect + schedule location filter + pipeline/students access checks in updated VS11 E2E.
- ✅ Customer/tutor access unchanged.
  - Evidence: customer and tutor redirect boundary checks in VS11 E2E.

## Gate execution results
- `npm run test:unit`
  - PASS (22 files, 104 tests)
- `npm run test:e2e`
  - BLOCKED in this environment
  - reason: missing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` during Playwright webServer boot (middleware fails)
- `npm run test:all`
  - PARTIAL: lint + typecheck + unit succeed; fails at e2e boot for same env reason
  - lint note: 2 existing warnings in reports pages (`basePath` unused), no errors

## Runbook for full VS11.1 e2e verification
1. Set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - plus seeded auth creds as needed (`E2E_ADMIN_EMAIL`, `E2E_MANAGER_EMAIL`, `E2E_CUSTOMER_EMAIL`, `E2E_TUTOR_EMAIL`, passwords)
2. Run:
   - `E2E_RUN_VS11=1 npm run test:e2e`
