-- VS2 verification queries (run as each role's JWT) + rollback notes
-- NOTE: Replace :customer_id, :tutor_id, :manager_id, :student_id, :session_id with real UUIDs.

-- =====================
-- MANAGER
-- =====================
-- Expect: can create sessions with time fields + recurrence_rule
insert into public.sessions (student_id, tutor_id, created_by, status, session_date, start_time, end_time, recurrence_rule)
values (:student_id, :tutor_id, :manager_id, 'scheduled', current_date, '15:00', '16:00', 'weekly:mon,wed')
returning id, session_date, start_time, end_time, recurrence_rule;

select id, tutor_id, session_date, start_time, end_time, recurrence_rule
from public.sessions
order by session_date desc
limit 5;

-- =====================
-- TUTOR
-- =====================
-- Expect: can read only own sessions
select * from public.sessions where tutor_id = :tutor_id;
select * from public.sessions where tutor_id <> :tutor_id;

-- =====================
-- CUSTOMER
-- =====================
-- Expect: can read sessions for their students only
select s.*
from public.sessions s
join public.students st on st.id = s.student_id
where st.customer_id = :customer_id;

-- =====================
-- ROLLBACK NOTES
-- =====================
-- 1) Drop VS2 policies:
--    drop policy if exists "Tutors can read own sessions" on public.sessions;
-- 2) Restore prior tutor policy:
--    create policy "Tutors can read sessions for assigned students"
--      on public.sessions
--      for select
--      using (
--        public.has_role(auth.uid(), 'tutor')
--        and exists (
--          select 1
--          from public.assignments a
--          where a.student_id = sessions.student_id
--            and a.tutor_id = auth.uid()
--            and a.status = 'active'
--        )
--      );
-- 3) Drop VS2 indexes:
--    drop index if exists public.sessions_tutor_date_start_time_idx;
--    drop index if exists public.sessions_session_date_start_time_idx;
-- 4) Drop VS2 constraint:
--    alter table public.sessions drop constraint if exists sessions_time_order_check;
-- 5) Drop VS2 columns:
--    alter table public.sessions drop column if exists recurrence_rule;
--    alter table public.sessions drop column if exists end_time;
--    alter table public.sessions drop column if exists start_time;
