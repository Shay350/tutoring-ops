# TASKS — Tutoring Ops App
Vertical-slice driven roadmap. Each slice must be fully end-to-end, production-quality, and leave the app in a working state.

Source of truth:
- SPEC.md for behavior rules / edge cases
- ARCHITECTURE.md for constraints
- This file defines WHAT to build and in WHAT ORDER

============================================================
GLOBAL CONSTRAINTS
============================================================

- Single organization internal tool
- Roles: Manager, Tutor, Customer
- Supabase Auth + Postgres + RLS required for all data
- No public self-serve onboarding (manager invites only)
- No automated payments
- No mobile app
- No drag-and-drop calendars
- No fully autonomous AI actions
- No schema changes without RLS
- No merge with failing tests

============================================================
VERTICAL SLICE 1 — Intake → Assign → Session Log (Core Backbone)
============================================================

GOAL:
Replace placeholder dashboards with a real, usable tutoring workflow:
Customer submits intake → Manager assigns tutor → Tutor logs session → Customer sees history.

------------------------------------------------------------
VS1 — Domain Model (must exist)
------------------------------------------------------------
- Intake
- Student
- Assignment (student ↔ tutor)
- Session
- SessionLog
- ProgressSnapshot (simple metrics only)

------------------------------------------------------------
VS1 — DB Tasks (DB Agent)
------------------------------------------------------------

A1. Create tables
- intakes
- students
- assignments
- sessions
- session_logs
- progress_snapshots (minimal)

Requirements:
- UUID primary keys
- created_at timestamps
- foreign keys with integrity constraints
- indexes on customer_id, tutor_id, student_id, status fields

A2. RLS policies
- Customer:
  - create/read own intakes
  - read own students, sessions, session_logs, progress
- Manager:
  - read/update all intakes
  - create students, assignments, sessions
  - read all data
- Tutor:
  - read assignments where tutor_id = auth.uid()
  - read sessions for assigned students
  - create/update session_logs for assigned students

Requirements:
- No table accessible without explicit policy
- Provide verification queries per role
- Provide rollback notes

------------------------------------------------------------
VS1 — Backend Tasks (Main Dev)
------------------------------------------------------------

B1. Server actions / routes
- submit intake (customer)
- list/review intakes (manager)
- approve intake → create student (manager)
- assign tutor to student (manager)
- create session (manager)
- list assigned students + sessions (tutor)
- create/update session log (tutor)
- list session history + progress (customer)

Requirements:
- Uses Supabase server client
- Input validation
- Friendly error handling

------------------------------------------------------------
VS1 — UI Tasks (Main Dev)
------------------------------------------------------------

C1. Customer
- Intake form (student info, subjects, availability, goals, location)
- My Students list (real data)
- Session History view

C2. Manager
- Intakes list + detail
- Approve intake flow
- Assign tutor flow
- Create session flow

C3. Tutor
- Assigned students dashboard
- Session log editor (topics, homework, next plan, customer-visible summary, private notes)

C4. Navigation
- Remove or clearly mark non-implemented items as “Coming soon”
- Role routing enforced

------------------------------------------------------------
VS1 — Testing (QA Agent)
------------------------------------------------------------

D1. Unit tests
- role guards (requireRole / resolveRolePath)
- intake validation
- session log permissions

D2. E2E tests
- customer submits intake
- manager processes intake → assignment → session
- tutor logs session
- customer views history

------------------------------------------------------------
VS1 — Exit Criteria
------------------------------------------------------------
- End-to-end flow works with real data
- RLS prevents cross-user access
- No placeholder data on VS1 screens
- All tests passing

============================================================
VERTICAL SLICE 2 — Scheduling + Master Schedule
============================================================

GOAL:
Turn sessions into a real planning tool for managers, tutors, and customers.

------------------------------------------------------------
VS2 — DB Tasks
------------------------------------------------------------
- Extend sessions:
  - start_time
  - end_time
  - recurrence_rule (simple weekly template)
- Index sessions by tutor_id + date

RLS:
- Tutors see only their sessions
- Customers see sessions for their students
- Managers see all

------------------------------------------------------------
VS2 — Backend Tasks
------------------------------------------------------------
- Create recurring sessions from template
- Query weekly schedule per role
- Prevent overlapping sessions per tutor

------------------------------------------------------------
VS2 — UI Tasks
------------------------------------------------------------
- Manager:
  - Master Schedule (list/grid by date + tutor)
- Tutor:
  - Weekly schedule view
- Customer:
  - Upcoming sessions list

(No drag-and-drop; deterministic creation only)

------------------------------------------------------------
VS2 — Testing
------------------------------------------------------------
- Recurring session creation
- Overlap prevention
- Schedule visibility per role

------------------------------------------------------------
VS2 — Exit Criteria
------------------------------------------------------------
- Managers can plan a week
- Tutors and customers see accurate schedules
- No overlapping tutor sessions allowed

============================================================
VERTICAL SLICE 3 — Progress Tracking + At-Risk Flags
============================================================

GOAL:
Make progress measurable and give managers visibility into risk.

------------------------------------------------------------
VS3 — DB Tasks
------------------------------------------------------------
- Extend progress_snapshots:
  - attendance_rate
  - homework_completion
  - last_session_delta
  - updated_at
- Add at_risk flag + reason on students

RLS:
- Tutors can update progress for assigned students
- Customers can read progress only
- Managers can read/update all

------------------------------------------------------------
VS3 — Backend Tasks
------------------------------------------------------------
- Update progress snapshot on session log submit
- Manager can mark/unmark at-risk with reason

------------------------------------------------------------
VS3 — UI Tasks
------------------------------------------------------------
- Tutor:
  - Progress inputs on session log
- Customer:
  - Progress summary view
- Manager:
  - At-risk indicator + filter

------------------------------------------------------------
VS3 — Testing
------------------------------------------------------------
- Progress updates propagate correctly
- At-risk visibility per role
- Regression tests on VS1/VS2 flows

------------------------------------------------------------
VS3 — Exit Criteria
------------------------------------------------------------
- Progress changes over time from real logs
- Managers can identify at-risk students
- No regression in prior slices

============================================================
GENERAL RULES
============================================================

- Only Main Dev merges into main
- DB Agent cannot touch app code
- QA Agent cannot change schema or feature logic
- Watchdog runs tests/lint and reports only
- No slice starts until previous slice is merged and green
