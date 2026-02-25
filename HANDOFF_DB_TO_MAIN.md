# DB Handoff to Main — VS1

## Migration files
- `supabase/migrations/20260129000000_vs1_core.sql`

## Tables and columns
- `public.intakes`
  - `id uuid pk`, `customer_id uuid -> auth.users`, `status`, `student_name`, `student_grade`, `subjects text[]`, `availability`, `goals`, `location`, `created_at`
- `public.students`
  - `id uuid pk`, `customer_id uuid -> auth.users`, `intake_id uuid -> public.intakes`, `full_name`, `status`, `created_at`
- `public.assignments`
  - `id uuid pk`, `student_id uuid -> public.students`, `tutor_id uuid -> auth.users`, `assigned_by uuid -> auth.users`, `status`, `created_at`
- `public.sessions`
  - `id uuid pk`, `student_id uuid -> public.students`, `tutor_id uuid -> auth.users`, `created_by uuid -> auth.users`, `status`, `session_date date`, `created_at`
- `public.session_logs`
  - `id uuid pk`, `session_id uuid -> public.sessions (unique)`, `topics`, `homework`, `next_plan`, `customer_summary`, `private_notes`, `created_at`, `updated_at`
- `public.progress_snapshots`
  - `id uuid pk`, `student_id uuid -> public.students`, `sessions_completed`, `last_session_at`, `notes`, `created_at`

## RLS policy summary
- `intakes`
  - Customer can insert/select own rows
  - Manager can read/update all
- `students`
  - Manager can insert/select all
  - Customer can read own
  - Tutor can read assigned students (active assignment)
- `assignments`
  - Manager can insert/select/update all
  - Tutor can read own assignments
- `sessions`
  - Manager can insert/select/update all (insert requires active assignment)
  - Customer can read sessions for own students
  - Tutor can read sessions for assigned students
- `session_logs`
  - Manager can read all
  - Customer can read logs for own students
  - Tutor can insert/update/read logs for assigned students
- `progress_snapshots`
  - Manager can insert/update/read all
  - Customer can read own

## Gotchas
- Session creation is allowed only when an active assignment exists for the student+tutor pair.
- Tutor access is restricted to `assignments.status = 'active'`.
- `session_logs` is one-per-session (`unique(session_id)`).
- `session_logs.updated_at` is not auto-updated by trigger; app should set it on update.

## Apply + verify
1) Apply migrations via Supabase CLI or SQL editor.
2) Run role-based verification queries in `supabase/verification/20260129_vs1_db_verification.sql` using JWTs for each role.
3) If rollback needed, follow rollback notes in the same verification file.

============================================================

# DB Handoff to Main — VS9

Filled for PR1 (DB/RLS): slotting suggestions table + manager-only RLS.

## Migration files
- `supabase/migrations/20260222000000_vs9_slotting_suggestions.sql`

## Verification files (optional but recommended)
- `supabase/verification/20260222_vs9_db_verification.sql`

## Tables and columns (final)
- `public.slotting_suggestions`
  - `id uuid pk default gen_random_uuid()`
  - `intake_id uuid not null -> public.intakes (on delete cascade)`
  - `student_id uuid -> public.students (nullable; on delete restrict)`
  - `tutor_id uuid not null -> auth.users`
  - `session_date date not null`
  - `start_time time not null`
  - `end_time time not null`
  - `score int not null default 0` (rank ordering)
  - `reasons jsonb not null default '{}'::jsonb` (explainable "why" payload)
  - `status text not null default 'new'` (`new|approved|rejected`)
  - `approved_by uuid -> auth.users` (nullable; on delete restrict)
  - `approved_at timestamptz` (nullable)
  - `created_at timestamptz not null default now()`

## RLS policy summary (required)
- Default deny
- Managers: select/insert/update/delete all suggestions
- Customers/Tutors: no access (unless explicitly added later)

## Indexes + constraints
- Indexes:
  - `slotting_suggestions_intake_id_idx` on `(intake_id)`
  - `slotting_suggestions_status_idx` on `(status)`
  - `slotting_suggestions_tutor_date_time_idx` on `(tutor_id, session_date, start_time)`
- Constraints:
  - `slotting_suggestions_time_check`: `end_time > start_time`
  - `slotting_suggestions_approved_fields_check`:
    - if `status = 'approved'` then `student_id`, `approved_by`, `approved_at` are required
    - otherwise `approved_by` and `approved_at` must be null
- Uniqueness / idempotency:
  - `slotting_suggestions_intake_slot_uniq` unique `(intake_id, tutor_id, session_date, start_time, end_time)` (supports generator upsert per intake+slot)
  - `slotting_suggestions_approved_tutor_slot_uniq` unique `(tutor_id, session_date, start_time, end_time)` where `status = 'approved'` (double-booking guardrail)

## Gotchas
- Approval sets `status='approved'` and must also set `student_id`, `approved_by`, and `approved_at` (DB constraint).
- Approved rows protect referenced `student_id` and `approved_by` from deletion (`on delete restrict`) to keep approval audit integrity consistent with the approved-fields check.
- Approving a second suggestion with the same `(tutor_id, session_date, start_time, end_time)` will fail due to the partial unique index.
- Suggested generator behavior: insert with upsert on `(intake_id, tutor_id, session_date, start_time, end_time)` and never overwrite approved rows.
- Keep "reasons" stable and deterministic for debuggability.

============================================================

# DB Handoff to Main — VS10

Filled for PR1 (DB/RLS): locations + location-scoped RLS and backfill.

## Migration files
- `supabase/migrations/20260224000000_vs10_locations.sql`

## Tables and columns (final)
- `public.locations`
  - `id uuid pk default gen_random_uuid()`
  - `name text not null unique`
  - `notes text null`
  - `active boolean not null default true`
  - `created_at timestamptz not null default now()`
- `public.profile_locations`
  - `profile_id uuid not null -> auth.users (on delete cascade)`
  - `location_id uuid not null -> public.locations (on delete cascade)`
  - `created_at timestamptz not null default now()`
  - `unique(profile_id, location_id)`
- `public.intakes`
  - `location_id uuid not null -> public.locations` (legacy `location text` retained for history/backfill)
- `public.sessions`
  - `location_id uuid not null -> public.locations` (derived by trigger from `student_id -> intake.location_id`, fallback `Default`)
- `public.operating_hours`
  - `location_id uuid not null -> public.locations`
  - uniqueness updated from `unique(weekday)` to `unique(location_id, weekday)`

## Helper SQL functions
- `public.default_location_id() -> uuid` (returns the id for location `name='Default'`)
- `public.has_location(uid uuid, location_id uuid) -> boolean` (checks `profile_locations`)
- `public.set_sessions_location_id() -> trigger` (ensures inserts/updates keep session location aligned with student intake)
- `public.sync_profile_location_assignments() -> trigger` (auto-assigns all locations to new non-pending manager/tutor profiles)

## RLS policy summary (required)
- Default deny (RLS enabled on all touched tables)
- `locations`
  - Managers: insert/update/delete
  - Managers/Tutors: select only locations assigned in `profile_locations`
  - Customers: select only locations tied to their own intake rows
- `profile_locations`
  - Managers: manage (all actions)
  - Users: can read their own assignments
- Location scoping added (manager/tutor access only) for:
  - `intakes`, `students`, `assignments`, `sessions`, `slotting_suggestions`, `operating_hours`
  - Customer policies remain constrained to “own rows” (no cross-customer access broadened).

## Backfill notes
- Inserts a `Default` location (idempotent).
- Creates locations from distinct legacy `intakes.location` strings using `initcap(lower(trim(location)))` for dedupe.
- Backfills:
  - `intakes.location_id` by mapping legacy `intakes.location` → `locations.name`, falling back to `Default`.
  - `sessions.location_id` via `sessions.student_id -> students.intake_id -> intakes.location_id`, falling back to `Default`.
  - `operating_hours.location_id` set to `Default` for legacy rows, then copied to every other location.
- New writes to `sessions` do not rely on a `location_id` default; a trigger derives `location_id` from student intake to prevent drift.
- To preserve pre-VS10 behavior, assigns all existing non-pending managers/tutors to all locations in `profile_locations` (can be tightened later via explicit admin assignment).

## How to verify
- Apply migrations in a dev DB (`supabase db reset` or SQL editor).
- Confirm `locations` has `Default` plus normalized legacy values from `intakes.location`.
- Confirm `operating_hours` has 7 weekday rows per location and uniqueness is enforced on `(location_id, weekday)`.
- As manager with one location assignment, verify location-scoped reads/writes on `intakes`, `sessions`, `operating_hours`, and `slotting_suggestions`.
- As tutor with one location assignment, verify reads are limited to assigned-location `students`/`assignments`/`sessions`.
- As customer, verify visibility remains limited to own rows and own linked locations.
