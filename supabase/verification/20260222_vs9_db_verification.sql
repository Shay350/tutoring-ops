-- VS9 verification queries (run as each role's JWT)
-- NOTE: Replace :intake_id, :other_intake_id, :student_id, :tutor_id, :manager_id with real UUIDs.

-- =====================
-- CUSTOMER
-- =====================
-- Expect: cannot read suggestions (RLS denies all rows)
select count(*) from public.slotting_suggestions;

-- Expect: cannot insert
insert into public.slotting_suggestions (intake_id, tutor_id, session_date, start_time, end_time, score, reasons)
values (:intake_id, :tutor_id, current_date + 7, '09:00', '10:00', 1, '{"why":"blocked"}');

-- =====================
-- TUTOR
-- =====================
-- Expect: cannot read suggestions (RLS denies all rows)
select count(*) from public.slotting_suggestions;

-- Expect: cannot update
update public.slotting_suggestions
  set score = score + 1
  where intake_id = :intake_id
returning id;

-- =====================
-- MANAGER
-- =====================
-- Expect: can create, approve, and delete suggestions
insert into public.slotting_suggestions (intake_id, tutor_id, session_date, start_time, end_time, score, reasons)
values (:intake_id, :tutor_id, current_date + 7, '09:00', '10:00', 100, '{"why":"test"}')
returning id;

-- Expect: approval requires student_id + approved_* fields (constraint)
update public.slotting_suggestions
  set status = 'approved',
      approved_by = :manager_id,
      approved_at = now(),
      student_id = :student_id
  where intake_id = :intake_id
returning id, status, approved_by, approved_at, student_id;

-- Expect: second approved suggestion for the same tutor+slot fails due to
-- `slotting_suggestions_approved_tutor_slot_uniq` (uses a different intake_id
-- so it does not fail first on `slotting_suggestions_intake_slot_uniq`)
insert into public.slotting_suggestions (intake_id, tutor_id, session_date, start_time, end_time, score, reasons, status, approved_by, approved_at, student_id)
values (:other_intake_id, :tutor_id, current_date + 7, '09:00', '10:00', 99, '{"why":"double book"}', 'approved', :manager_id, now(), :student_id);

-- =====================
-- ROLLBACK NOTES
-- =====================
-- 1) Drop policies:
--    drop policy if exists "Managers can delete slotting suggestions" on public.slotting_suggestions;
--    drop policy if exists "Managers can update slotting suggestions" on public.slotting_suggestions;
--    drop policy if exists "Managers can insert slotting suggestions" on public.slotting_suggestions;
--    drop policy if exists "Managers can read all slotting suggestions" on public.slotting_suggestions;
-- 2) Disable RLS (optional):
--    alter table public.slotting_suggestions disable row level security;
-- 3) Drop table:
--    drop table if exists public.slotting_suggestions;
