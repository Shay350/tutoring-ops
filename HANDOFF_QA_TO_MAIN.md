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
