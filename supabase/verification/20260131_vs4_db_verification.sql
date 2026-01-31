-- VS4 verification queries (run as each role's JWT) + rollback notes
-- NOTE: Replace :customer_id, :tutor_id, :manager_id, :student_id, :other_student_id,
-- :membership_id, :session_id with real UUIDs.

-- =====================
-- CUSTOMER
-- =====================
-- Expect: can read membership for own student only
select *
from public.memberships m
join public.students st on st.id = m.student_id
where st.customer_id = :customer_id;

select *
from public.memberships m
join public.students st on st.id = m.student_id
where st.customer_id <> :customer_id;

-- Expect: cannot insert adjustments
insert into public.membership_adjustments (membership_id, actor_id, delta_hours, reason)
values (:membership_id, :customer_id, -1, 'Customer should be blocked');

-- =====================
-- TUTOR
-- =====================
-- Expect: can read memberships for assigned students only
select *
from public.memberships m
join public.assignments a on a.student_id = m.student_id
where a.tutor_id = :tutor_id;

-- Expect: cannot update memberships
update public.memberships
  set hours_remaining = hours_remaining - 1
  where student_id = :student_id
returning id;

-- Expect: cannot insert adjustments
insert into public.membership_adjustments (membership_id, actor_id, delta_hours, reason)
values (:membership_id, :tutor_id, -1, 'Tutor should be blocked');

-- =====================
-- MANAGER
-- =====================
-- Expect: can create/update memberships and insert adjustments
insert into public.memberships (student_id, plan_type, status, hours_total, hours_remaining, renewal_date)
values (:student_id, 'monthly-8', 'active', 8, 8, current_date + 30)
returning id;

update public.memberships
  set hours_remaining = hours_remaining - 1
  where student_id = :student_id
returning id, hours_remaining;

insert into public.membership_adjustments (membership_id, actor_id, session_id, delta_hours, reason)
values (:membership_id, :manager_id, :session_id, -1, 'Completed session')
returning id;

select * from public.membership_adjustments where membership_id = :membership_id;

-- Expect: second insert with same session_id fails due to unique constraint
insert into public.membership_adjustments (membership_id, actor_id, session_id, delta_hours, reason)
values (:membership_id, :manager_id, :session_id, -1, 'Duplicate billing test');

-- =====================
-- ROLLBACK NOTES
-- =====================
-- 1) Drop policies (reverse order):
--    drop policy if exists "Managers can insert membership adjustments" on public.membership_adjustments;
--    drop policy if exists "Managers can read all membership adjustments" on public.membership_adjustments;
--    drop policy if exists "Tutors can read memberships for assigned students" on public.memberships;
--    drop policy if exists "Customers can read own memberships" on public.memberships;
--    drop policy if exists "Managers can delete memberships" on public.memberships;
--    drop policy if exists "Managers can update memberships" on public.memberships;
--    drop policy if exists "Managers can insert memberships" on public.memberships;
--    drop policy if exists "Managers can read all memberships" on public.memberships;
-- 2) Disable RLS (optional):
--    alter table public.membership_adjustments disable row level security;
--    alter table public.memberships disable row level security;
-- 3) Drop triggers + function:
--    drop trigger if exists set_memberships_updated_at on public.memberships;
--    drop function if exists public.set_updated_at();
-- 4) Drop tables (reverse dependency order):
--    drop table if exists public.membership_adjustments;
--    drop table if exists public.memberships;
