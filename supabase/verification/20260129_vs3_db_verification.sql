-- VS3 verification queries (run as each role's JWT) + rollback notes
-- NOTE: Replace :customer_id, :tutor_id, :manager_id, :student_id, :session_id with real UUIDs.

-- =====================
-- MANAGER
-- =====================
-- Expect: can update at-risk flags on students
update public.students
  set at_risk = true,
      at_risk_reason = 'Falling behind'
  where id = :student_id
returning id, at_risk, at_risk_reason;

-- Expect: can update progress snapshots
insert into public.progress_snapshots (
  student_id,
  sessions_completed,
  last_session_at,
  attendance_rate,
  homework_completion,
  last_session_delta,
  notes,
  updated_at
)
values (
  :student_id,
  5,
  now(),
  90,
  80,
  7,
  'Making steady progress',
  now()
)
returning id;

-- Expect: can call progress snapshot updater (uses full session history)
select public.upsert_progress_snapshot(:student_id, 92, 88, 'Updated via function');

-- =====================
-- TUTOR
-- =====================
-- Expect: can read/update progress snapshots for assigned students only
select * from public.progress_snapshots where student_id = :student_id;

update public.progress_snapshots
  set attendance_rate = 95,
      homework_completion = 85,
      last_session_delta = 6,
      updated_at = now()
  where student_id = :student_id
returning id;

-- Expect: can call progress snapshot updater for assigned student
select public.upsert_progress_snapshot(:student_id, 95, 85, 'Tutor refresh');

-- =====================
-- CUSTOMER
-- =====================
-- Expect: can read progress snapshots for their students only
select ps.*
from public.progress_snapshots ps
join public.students st on st.id = ps.student_id
where st.customer_id = :customer_id;

-- =====================
-- ROLLBACK NOTES
-- =====================
-- 1) Drop VS3 policies:
--    drop policy if exists "Tutors can update progress snapshots for assigned students" on public.progress_snapshots;
--    drop policy if exists "Tutors can create progress snapshots for assigned students" on public.progress_snapshots;
--    drop policy if exists "Tutors can read progress snapshots for assigned students" on public.progress_snapshots;
--    drop policy if exists "Managers can update students" on public.students;
-- 2) Drop VS3 indexes:
--    drop index if exists public.students_at_risk_idx;
-- 3) Drop VS3 constraints:
--    alter table public.progress_snapshots drop constraint if exists progress_snapshots_homework_completion_check;
--    alter table public.progress_snapshots drop constraint if exists progress_snapshots_attendance_rate_check;
-- 4) Drop VS3 columns:
--    alter table public.students drop column if exists at_risk_reason;
--    alter table public.students drop column if exists at_risk;
--    alter table public.progress_snapshots drop column if exists updated_at;
--    alter table public.progress_snapshots drop column if exists last_session_delta;
--    alter table public.progress_snapshots drop column if exists homework_completion;
--    alter table public.progress_snapshots drop column if exists attendance_rate;
