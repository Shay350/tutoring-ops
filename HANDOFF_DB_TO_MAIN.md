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

# DB Handoff to Main — VS9 (Template)

This section is a template for VS9 DB work. Fill in when VS9 DB PR is ready.

## Migration files
- `supabase/migrations/<timestamp>_vs9_slotting_suggestions.sql`

## Tables and columns (proposed)
- `public.slotting_suggestions`
  - `id uuid pk`
  - `intake_id uuid -> public.intakes`
  - `student_id uuid -> public.students` (nullable until intake approved)
  - `tutor_id uuid -> auth.users`
  - `session_date date`
  - `start_time time`
  - `end_time time`
  - `score int` (rank ordering)
  - `reasons jsonb` (explainable "why" payload)
  - `status text` (`new|approved|rejected`)
  - `approved_by uuid -> auth.users` (nullable)
  - `approved_at timestamptz` (nullable)
  - `created_at timestamptz`

## RLS policy summary (required)
- Default deny
- Managers: select/insert/update/delete all suggestions
- Customers/Tutors: no access (unless explicitly added later)

## Indexes (expected)
- `intake_id`, `status`, `(tutor_id, session_date, start_time)`

## Gotchas
- Enforce idempotency at approval time (unique constraint or app-level guard).
- Keep "reasons" stable and deterministic for debuggability.
