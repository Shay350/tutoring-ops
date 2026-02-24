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
