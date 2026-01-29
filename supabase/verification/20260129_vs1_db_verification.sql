-- VS1 verification queries (run as each role's JWT) + rollback notes
-- NOTE: Replace :customer_id, :tutor_id, :manager_id, :student_id, :session_id, :intake_id with real UUIDs.

-- =====================
-- CUSTOMER
-- =====================
-- Expect: can insert/select own intake; cannot read others
insert into public.intakes (customer_id, student_name, subjects)
values (:customer_id, 'Sample Student', array['Math'])
returning id;

select * from public.intakes where customer_id = :customer_id;
select * from public.intakes where customer_id <> :customer_id;

-- Expect: can read own students, sessions, session_logs, progress_snapshots
select * from public.students where customer_id = :customer_id;
select * from public.sessions s join public.students st on st.id = s.student_id where st.customer_id = :customer_id;
select * from public.session_logs sl
  join public.sessions s on s.id = sl.session_id
  join public.students st on st.id = s.student_id
  where st.customer_id = :customer_id;
select * from public.progress_snapshots ps join public.students st on st.id = ps.student_id where st.customer_id = :customer_id;

-- =====================
-- MANAGER
-- =====================
-- Expect: read/update all intakes; create students/assignments/sessions; read all data
select * from public.intakes;
update public.intakes set status = 'approved' where id = :intake_id returning id, status;

insert into public.students (customer_id, intake_id, full_name)
values (:customer_id, :intake_id, 'Student One')
returning id;

insert into public.assignments (student_id, tutor_id, assigned_by)
values (:student_id, :tutor_id, :manager_id)
returning id;

insert into public.sessions (student_id, tutor_id, created_by, session_date)
values (:student_id, :tutor_id, :manager_id, current_date)
returning id;

select * from public.students;
select * from public.assignments;
select * from public.sessions;
select * from public.session_logs;
select * from public.progress_snapshots;

-- =====================
-- TUTOR
-- =====================
-- Expect: read own assignments; read sessions for assigned students; create/update session_logs for assigned students
select * from public.assignments where tutor_id = :tutor_id;
select * from public.sessions s
  join public.assignments a on a.student_id = s.student_id
  where a.tutor_id = :tutor_id;

insert into public.session_logs (session_id, topics, customer_summary)
values (:session_id, 'Fractions', 'Great focus today')
returning id;

update public.session_logs
  set homework = 'Practice worksheet', updated_at = now()
  where session_id = :session_id
returning id;

select * from public.session_logs sl
  join public.sessions s on s.id = sl.session_id
  join public.assignments a on a.student_id = s.student_id
  where a.tutor_id = :tutor_id;

-- =====================
-- ROLLBACK NOTES
-- =====================
-- 1) Drop policies (in reverse order):
--    drop policy if exists "Customers can read own progress snapshots" on public.progress_snapshots;
--    drop policy if exists "Managers can update progress snapshots" on public.progress_snapshots;
--    drop policy if exists "Managers can create progress snapshots" on public.progress_snapshots;
--    drop policy if exists "Managers can read all progress snapshots" on public.progress_snapshots;
--    drop policy if exists "Tutors can read session logs for assigned students" on public.session_logs;
--    drop policy if exists "Tutors can update session logs for assigned students" on public.session_logs;
--    drop policy if exists "Tutors can create session logs for assigned students" on public.session_logs;
--    drop policy if exists "Customers can read own session logs" on public.session_logs;
--    drop policy if exists "Managers can read all session logs" on public.session_logs;
--    drop policy if exists "Tutors can read sessions for assigned students" on public.sessions;
--    drop policy if exists "Customers can read own sessions" on public.sessions;
--    drop policy if exists "Managers can update all sessions" on public.sessions;
--    drop policy if exists "Managers can read all sessions" on public.sessions;
--    drop policy if exists "Managers can create sessions" on public.sessions;
--    drop policy if exists "Tutors can read own assignments" on public.assignments;
--    drop policy if exists "Managers can update assignments" on public.assignments;
--    drop policy if exists "Managers can read all assignments" on public.assignments;
--    drop policy if exists "Managers can create assignments" on public.assignments;
--    drop policy if exists "Tutors can read assigned students" on public.students;
--    drop policy if exists "Customers can read own students" on public.students;
--    drop policy if exists "Managers can read all students" on public.students;
--    drop policy if exists "Managers can create students" on public.students;
--    drop policy if exists "Managers can update all intakes" on public.intakes;
--    drop policy if exists "Managers can read all intakes" on public.intakes;
--    drop policy if exists "Customers can read own intakes" on public.intakes;
--    drop policy if exists "Customers can create own intakes" on public.intakes;
-- 2) Disable RLS (optional):
--    alter table public.progress_snapshots disable row level security;
--    alter table public.session_logs disable row level security;
--    alter table public.sessions disable row level security;
--    alter table public.assignments disable row level security;
--    alter table public.students disable row level security;
--    alter table public.intakes disable row level security;
-- 3) Drop tables (reverse dependency order):
--    drop table if exists public.progress_snapshots;
--    drop table if exists public.session_logs;
--    drop table if exists public.sessions;
--    drop table if exists public.assignments;
--    drop table if exists public.students;
--    drop table if exists public.intakes;
