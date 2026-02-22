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

# QA → Main Handoff (VS9) (Template)

This section is a template for VS9 QA work. Fill in when VS9 QA PR is ready.

## Tests added (expected)
- Unit: generator ranking + edge cases (operating hours, capacity, constraints)
- E2E: intake submit -> suggestions appear -> manager approves -> sessions visible

## How to run
- Unit tests: `npm run test:unit`
- VS9 E2E (proposed): `E2E_RUN_VS9=1 npm run test:e2e`

## data-testid needed (MAIN) (proposed)
Manager intake review `/manager/pipeline/[intakeId]`
- `slotting-suggestions-list`
- `slotting-suggestion-row`
- `slotting-approve`
- `slotting-reject`
- `slotting-why`

Manager schedule `/manager/schedule`
- Confirm approved suggestions create sessions visible on calendar.
