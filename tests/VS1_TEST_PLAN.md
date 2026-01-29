# VS1 Test Plan — Intake → Assign → Session Log

## Scope
Covers the VS1 backbone flow end-to-end with role boundaries enforced:
Customer submits intake → Manager approves intake → Manager assigns tutor → Manager creates session → Tutor logs session → Customer views history + progress.

## Test Data & Preconditions
- Supabase project configured with VS1 migrations applied.
- Seeded users (or invites) for Manager, Tutor, Customer.
- Known tutor display name for assignment selection.
- Playwright env vars:
  - `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`
  - `E2E_MANAGER_EMAIL`, `E2E_MANAGER_PASSWORD`
  - `E2E_TUTOR_EMAIL`, `E2E_TUTOR_PASSWORD`
  - `E2E_TUTOR_NAME` (label in assign dropdown)
  - `E2E_RUN_VS1=1` to enable @smoke flow

## Happy Path (E2E)
1. Customer logs in and submits intake with student info, subjects, availability, goals, location.
2. Manager logs in, reviews the intake, approves it to create a student record.
3. Manager assigns a tutor to the student.
4. Manager creates a session for the student.
5. Tutor logs in, opens session, submits session log (topics/homework/next plan/customer summary/private notes).
6. Customer views session history and sees the new log and updated progress snapshot.

## Key Edge Cases
- Intake validation:
  - Missing required fields (student name, subjects).
  - Invalid subjects format (empty list or whitespace only).
  - Status transitions reject invalid status values.
- Role boundaries:
  - Customer cannot access manager/tutor routes.
  - Tutor cannot approve intakes or create sessions.
  - Customer cannot create/modify session logs.
- Session log permissions:
  - Tutor can only create/update logs for assigned students.
  - Tutor cannot read logs for unassigned students.
  - Customer can read only their own logs.
- Data integrity:
  - Assignments require active tutor with role=tutor.
  - Sessions require an active assignment.
  - Session logs are unique per session.

## Unit/Integration Coverage (Vitest)
- `requireRole` guard redirects for unauth, pending, and wrong-role users.
- `resolveRolePath` maps roles and handles unknown.
- Intake schema constraints: required columns and status check in migration.
- Session log permissions: RLS policy presence in migration (create/read/update per role).

## Non-Goals (VS1)
- Scheduling recurrence (VS2).
- Payments.
- Drag-and-drop calendars.
