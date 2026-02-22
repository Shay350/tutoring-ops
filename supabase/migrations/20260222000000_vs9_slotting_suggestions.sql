-- VS9 slotting suggestions (deterministic) + RLS (manager-only)

create table if not exists public.slotting_suggestions (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.intakes (id) on delete cascade,
  student_id uuid references public.students (id) on delete restrict,
  tutor_id uuid not null references auth.users (id) on delete restrict,
  session_date date not null,
  start_time time not null,
  end_time time not null,
  score int not null default 0,
  reasons jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  approved_by uuid references auth.users (id) on delete restrict,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.slotting_suggestions
  drop constraint if exists slotting_suggestions_time_check;

alter table public.slotting_suggestions
  add constraint slotting_suggestions_time_check
  check (end_time > start_time);

alter table public.slotting_suggestions
  drop constraint if exists slotting_suggestions_approved_fields_check;

alter table public.slotting_suggestions
  add constraint slotting_suggestions_approved_fields_check
  check (
    (status = 'approved' and student_id is not null and approved_by is not null and approved_at is not null)
    or
    (status <> 'approved' and approved_by is null and approved_at is null)
  );

create index if not exists slotting_suggestions_intake_id_idx
  on public.slotting_suggestions (intake_id);

create index if not exists slotting_suggestions_status_idx
  on public.slotting_suggestions (status);

create index if not exists slotting_suggestions_tutor_date_time_idx
  on public.slotting_suggestions (tutor_id, session_date, start_time);

-- Supports generator idempotency/upsert per intake + slot.
create unique index if not exists slotting_suggestions_intake_slot_uniq
  on public.slotting_suggestions (intake_id, tutor_id, session_date, start_time, end_time);

-- Prevent approving multiple suggestions for the same tutor/slot (double-booking guardrail).
create unique index if not exists slotting_suggestions_approved_tutor_slot_uniq
  on public.slotting_suggestions (tutor_id, session_date, start_time, end_time)
  where status = 'approved';

alter table public.slotting_suggestions enable row level security;

drop policy if exists "Managers can read all slotting suggestions" on public.slotting_suggestions;
create policy "Managers can read all slotting suggestions"
  on public.slotting_suggestions
  for select
  using (public.is_manager(auth.uid()));

drop policy if exists "Managers can insert slotting suggestions" on public.slotting_suggestions;
create policy "Managers can insert slotting suggestions"
  on public.slotting_suggestions
  for insert
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can update slotting suggestions" on public.slotting_suggestions;
create policy "Managers can update slotting suggestions"
  on public.slotting_suggestions
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can delete slotting suggestions" on public.slotting_suggestions;
create policy "Managers can delete slotting suggestions"
  on public.slotting_suggestions
  for delete
  using (public.is_manager(auth.uid()));
