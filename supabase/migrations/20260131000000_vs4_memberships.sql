-- VS4 memberships + adjustments + RLS

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Billing flag for idempotent membership charging.
alter table public.sessions
  add column if not exists billed_to_membership boolean not null default false;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  plan_type text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'trial')),
  hours_total numeric not null check (hours_total >= 0),
  hours_remaining numeric not null check (hours_remaining >= 0),
  renewal_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create index if not exists memberships_student_id_idx on public.memberships (student_id);
create index if not exists memberships_status_idx on public.memberships (status);
create index if not exists memberships_renewal_date_idx on public.memberships (renewal_date);

create trigger set_memberships_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- Idempotent billing: track session_id on adjustments with a unique index so each session can decrement once.
-- This avoids adding a billing flag to sessions (Option B).
create table if not exists public.membership_adjustments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete restrict,
  session_id uuid references public.sessions (id) on delete set null,
  delta_hours numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists membership_adjustments_membership_id_idx on public.membership_adjustments (membership_id);
create index if not exists membership_adjustments_actor_id_idx on public.membership_adjustments (actor_id);
create unique index if not exists membership_adjustments_session_id_uidx
  on public.membership_adjustments (session_id)
  where session_id is not null;

alter table public.memberships enable row level security;
alter table public.membership_adjustments enable row level security;

create policy "Managers can read all memberships"
  on public.memberships
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can insert memberships"
  on public.memberships
  for insert
  with check (public.is_manager(auth.uid()));

create policy "Managers can update memberships"
  on public.memberships
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Managers can delete memberships"
  on public.memberships
  for delete
  using (public.is_manager(auth.uid()));

create policy "Customers can read own memberships"
  on public.memberships
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.students st
      where st.id = memberships.student_id
        and st.customer_id = auth.uid()
    )
  );

create policy "Tutors can read memberships for assigned students"
  on public.memberships
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = memberships.student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy "Managers can read all membership adjustments"
  on public.membership_adjustments
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can insert membership adjustments"
  on public.membership_adjustments
  for insert
  with check (
    public.is_manager(auth.uid())
    and actor_id = auth.uid()
  );
