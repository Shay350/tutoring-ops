-- VS10 multi-location: locations + location-scoped RLS + backfill

-- 1) Core tables

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create index if not exists locations_active_idx
  on public.locations (active);

create table if not exists public.profile_locations (
  profile_id uuid not null references auth.users (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, location_id)
);

create index if not exists profile_locations_profile_id_idx
  on public.profile_locations (profile_id);

create index if not exists profile_locations_location_id_idx
  on public.profile_locations (location_id);

alter table public.locations enable row level security;
alter table public.profile_locations enable row level security;

-- 2) Helper functions

create or replace function public.default_location_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.locations
  where name = 'Default'
  limit 1;
$$;

create or replace function public.has_location(uid uuid, location_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profile_locations pl
    where pl.profile_id = uid
      and pl.location_id = $2
  );
$$;

-- 3) RLS: profile_locations

drop policy if exists "Managers can manage profile locations" on public.profile_locations;
create policy "Managers can manage profile locations"
  on public.profile_locations
  for all
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

drop policy if exists "Users can read own location assignments" on public.profile_locations;
create policy "Users can read own location assignments"
  on public.profile_locations
  for select
  using (auth.uid() = profile_id);

-- 4) RLS: locations

drop policy if exists "Managers can insert locations" on public.locations;
create policy "Managers can insert locations"
  on public.locations
  for insert
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can update locations" on public.locations;
create policy "Managers can update locations"
  on public.locations
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can delete locations" on public.locations;
create policy "Managers can delete locations"
  on public.locations
  for delete
  using (public.is_manager(auth.uid()));

drop policy if exists "Managers and tutors can read assigned locations" on public.locations;
create policy "Managers and tutors can read assigned locations"
  on public.locations
  for select
  using (
    (
      public.is_manager(auth.uid())
      or public.has_role(auth.uid(), 'tutor')
    )
    and public.has_location(auth.uid(), locations.id)
  );

drop policy if exists "Customers can read own locations" on public.locations;
create policy "Customers can read own locations"
  on public.locations
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.intakes i
      where i.customer_id = auth.uid()
        and i.location_id = locations.id
    )
  );

-- 5) Backfill: seed locations and assignments

-- Ensure "Default" exists (idempotent).
insert into public.locations (name, notes, active)
values ('Default', 'Fallback location for legacy or unspecified records.', true)
on conflict (name) do nothing;

-- Create locations from legacy intake.location strings (trim/lower for dedupe).
-- Canonical format: initcap(lower(trim(location))).
insert into public.locations (name, active)
select distinct initcap(lower(trim(i.location))), true
from public.intakes i
where i.location is not null
  and trim(i.location) <> ''
  and initcap(lower(trim(i.location))) <> 'Default'
on conflict (name) do nothing;

-- Assign all existing managers + tutors to all locations to preserve pre-VS10 behavior.
-- (Can be tightened later by explicitly managing profile_locations.)
insert into public.profile_locations (profile_id, location_id)
select p.id, l.id
from public.profiles p
cross join public.locations l
where p.role in ('manager', 'tutor')
  and p.pending = false
on conflict (profile_id, location_id) do nothing;

create or replace function public.sync_profile_location_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role in ('manager', 'tutor') and new.pending = false then
    insert into public.profile_locations (profile_id, location_id)
    select new.id, l.id
    from public.locations l
    on conflict (profile_id, location_id) do nothing;
  else
    delete from public.profile_locations
    where profile_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_location_assignments on public.profiles;
create trigger sync_profile_location_assignments
  after insert or update of role, pending on public.profiles
  for each row execute function public.sync_profile_location_assignments();

-- 6) Location-ize intakes (keep legacy location text for history/backfill)

alter table public.intakes
  add column if not exists location_id uuid references public.locations (id);

update public.intakes i
set location_id = (
  select l.id
  from public.locations l
  where l.name = initcap(lower(trim(i.location)))
  limit 1
)
where i.location_id is null
  and i.location is not null
  and trim(i.location) <> '';

update public.intakes
set location_id = public.default_location_id()
where location_id is null;

alter table public.intakes
  alter column location_id set default public.default_location_id(),
  alter column location_id set not null;

create index if not exists intakes_location_id_idx
  on public.intakes (location_id);

-- 7) Location-ize sessions

alter table public.sessions
  add column if not exists location_id uuid references public.locations (id);

update public.sessions se
set location_id = coalesce(
  (
    select i.location_id
    from public.students st
    join public.intakes i on i.id = st.intake_id
    where st.id = se.student_id
    limit 1
  ),
  public.default_location_id()
)
where se.location_id is null;

alter table public.sessions
  alter column location_id drop default,
  alter column location_id set not null;

create index if not exists sessions_location_id_idx
  on public.sessions (location_id);

create or replace function public.set_sessions_location_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT'
     or new.location_id is null
     or new.student_id is distinct from old.student_id then
    select i.location_id
      into new.location_id
      from public.students st
      join public.intakes i on i.id = st.intake_id
      where st.id = new.student_id
      limit 1;

    if new.location_id is null then
      new.location_id := public.default_location_id();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_sessions_location_id on public.sessions;
create trigger set_sessions_location_id
  before insert or update of student_id, location_id on public.sessions
  for each row execute function public.set_sessions_location_id();

-- 8) Location-ize operating hours (copy legacy global rows to each location)

alter table public.operating_hours
  add column if not exists location_id uuid references public.locations (id);

update public.operating_hours
set location_id = public.default_location_id()
where location_id is null;

alter table public.operating_hours
  alter column location_id set default public.default_location_id(),
  alter column location_id set not null;

-- Replace unique(weekday) with unique(location_id, weekday).
alter table public.operating_hours
  drop constraint if exists operating_hours_weekday_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'operating_hours_location_weekday_key'
      and conrelid = 'public.operating_hours'::regclass
  ) then
    alter table public.operating_hours
      add constraint operating_hours_location_weekday_key unique (location_id, weekday);
  end if;
end $$;

drop index if exists operating_hours_weekday_idx;
create index if not exists operating_hours_location_weekday_idx
  on public.operating_hours (location_id, weekday);

-- Copy default hours to every other location (idempotent).
insert into public.operating_hours (
  location_id,
  weekday,
  is_closed,
  open_time,
  close_time,
  created_at,
  updated_at
)
select
  l.id,
  oh.weekday,
  oh.is_closed,
  oh.open_time,
  oh.close_time,
  oh.created_at,
  oh.updated_at
from public.locations l
join public.operating_hours oh
  on oh.location_id = public.default_location_id()
where l.id <> public.default_location_id()
on conflict (location_id, weekday) do nothing;

-- 9) RLS updates: location scoping for manager/tutor access

-- intakes
drop policy if exists "Managers can read all intakes" on public.intakes;
create policy "Managers can read all intakes"
  on public.intakes
  for select
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), intakes.location_id)
  );

drop policy if exists "Managers can update all intakes" on public.intakes;
create policy "Managers can update all intakes"
  on public.intakes
  for update
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), intakes.location_id)
  )
  with check (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), intakes.location_id)
  );

-- students
drop policy if exists "Managers can create students" on public.students;
create policy "Managers can create students"
  on public.students
  for insert
  with check (
    public.is_manager(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = customer_id
        and p.role = 'customer'
        and p.pending = false
    )
    and public.has_location(
      auth.uid(),
      coalesce(
        (select i.location_id from public.intakes i where i.id = intake_id limit 1),
        public.default_location_id()
      )
    )
  );

drop policy if exists "Managers can read all students" on public.students;
create policy "Managers can read all students"
  on public.students
  for select
  using (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      coalesce(
        (select i.location_id from public.intakes i where i.id = students.intake_id limit 1),
        public.default_location_id()
      )
    )
  );

drop policy if exists "Tutors can read assigned students" on public.students;
create policy "Tutors can read assigned students"
  on public.students
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = students.id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
    and public.has_location(
      auth.uid(),
      coalesce(
        (select i.location_id from public.intakes i where i.id = students.intake_id limit 1),
        public.default_location_id()
      )
    )
  );

-- assignments
drop policy if exists "Managers can create assignments" on public.assignments;
create policy "Managers can create assignments"
  on public.assignments
  for insert
  with check (
    public.is_manager(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = tutor_id
        and p.role = 'tutor'
        and p.pending = false
    )
    and public.has_location(
      auth.uid(),
      coalesce(
        (
          select i.location_id
          from public.students st
          join public.intakes i on i.id = st.intake_id
          where st.id = student_id
          limit 1
        ),
        public.default_location_id()
      )
    )
  );

drop policy if exists "Managers can read all assignments" on public.assignments;
create policy "Managers can read all assignments"
  on public.assignments
  for select
  using (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      coalesce(
        (
          select i.location_id
          from public.students st
          join public.intakes i on i.id = st.intake_id
          where st.id = assignments.student_id
          limit 1
        ),
        public.default_location_id()
      )
    )
  );

drop policy if exists "Managers can update assignments" on public.assignments;
create policy "Managers can update assignments"
  on public.assignments
  for update
  using (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      coalesce(
        (
          select i.location_id
          from public.students st
          join public.intakes i on i.id = st.intake_id
          where st.id = assignments.student_id
          limit 1
        ),
        public.default_location_id()
      )
    )
  )
  with check (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      coalesce(
        (
          select i.location_id
          from public.students st
          join public.intakes i on i.id = st.intake_id
          where st.id = assignments.student_id
          limit 1
        ),
        public.default_location_id()
      )
    )
  );

drop policy if exists "Tutors can read own assignments" on public.assignments;
create policy "Tutors can read own assignments"
  on public.assignments
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and tutor_id = auth.uid()
    and public.has_location(
      auth.uid(),
      coalesce(
        (
          select i.location_id
          from public.students st
          join public.intakes i on i.id = st.intake_id
          where st.id = assignments.student_id
          limit 1
        ),
        public.default_location_id()
      )
    )
  );

-- sessions
drop policy if exists "Managers can create sessions" on public.sessions;
create policy "Managers can create sessions"
  on public.sessions
  for insert
  with check (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), sessions.location_id)
    and exists (
      select 1
      from public.assignments a
      where a.student_id = student_id
        and a.tutor_id = tutor_id
        and a.status = 'active'
    )
  );

drop policy if exists "Managers can read all sessions" on public.sessions;
create policy "Managers can read all sessions"
  on public.sessions
  for select
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), sessions.location_id)
  );

drop policy if exists "Managers can update all sessions" on public.sessions;
create policy "Managers can update all sessions"
  on public.sessions
  for update
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), sessions.location_id)
  )
  with check (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), sessions.location_id)
  );

drop policy if exists "Tutors can read own sessions" on public.sessions;
create policy "Tutors can read own sessions"
  on public.sessions
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and tutor_id = auth.uid()
    and public.has_location(auth.uid(), sessions.location_id)
  );

-- slotting_suggestions (manager-only; additionally location-scoped via intake)
drop policy if exists "Managers can read all slotting suggestions" on public.slotting_suggestions;
create policy "Managers can read all slotting suggestions"
  on public.slotting_suggestions
  for select
  using (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.intakes i
      where i.id = slotting_suggestions.intake_id
        and public.has_location(auth.uid(), i.location_id)
    )
  );

drop policy if exists "Managers can insert slotting suggestions" on public.slotting_suggestions;
create policy "Managers can insert slotting suggestions"
  on public.slotting_suggestions
  for insert
  with check (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.intakes i
      where i.id = slotting_suggestions.intake_id
        and public.has_location(auth.uid(), i.location_id)
    )
  );

drop policy if exists "Managers can update slotting suggestions" on public.slotting_suggestions;
create policy "Managers can update slotting suggestions"
  on public.slotting_suggestions
  for update
  using (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.intakes i
      where i.id = slotting_suggestions.intake_id
        and public.has_location(auth.uid(), i.location_id)
    )
  )
  with check (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.intakes i
      where i.id = slotting_suggestions.intake_id
        and public.has_location(auth.uid(), i.location_id)
    )
  );

drop policy if exists "Managers can delete slotting suggestions" on public.slotting_suggestions;
create policy "Managers can delete slotting suggestions"
  on public.slotting_suggestions
  for delete
  using (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.intakes i
      where i.id = slotting_suggestions.intake_id
        and public.has_location(auth.uid(), i.location_id)
    )
  );

-- operating_hours
drop policy if exists "Authenticated can read operating hours" on public.operating_hours;
create policy "Authenticated can read operating hours"
  on public.operating_hours
  for select
  using (
    auth.uid() is not null
    and (
      (
        (public.is_manager(auth.uid()) or public.has_role(auth.uid(), 'tutor'))
        and public.has_location(auth.uid(), operating_hours.location_id)
      )
      or
      (
        public.has_role(auth.uid(), 'customer')
        and (
          exists (
            select 1
            from public.intakes i
            where i.customer_id = auth.uid()
              and i.location_id = operating_hours.location_id
          )
          or exists (
            select 1
            from public.students st
            join public.intakes i on i.id = st.intake_id
            where st.customer_id = auth.uid()
              and i.location_id = operating_hours.location_id
          )
        )
      )
    )
  );

drop policy if exists "Managers can insert operating hours" on public.operating_hours;
create policy "Managers can insert operating hours"
  on public.operating_hours
  for insert
  with check (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), operating_hours.location_id)
  );

drop policy if exists "Managers can update operating hours" on public.operating_hours;
create policy "Managers can update operating hours"
  on public.operating_hours
  for update
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), operating_hours.location_id)
  )
  with check (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), operating_hours.location_id)
  );

drop policy if exists "Managers can delete operating hours" on public.operating_hours;
create policy "Managers can delete operating hours"
  on public.operating_hours
  for delete
  using (
    public.is_manager(auth.uid())
    and public.has_location(auth.uid(), operating_hours.location_id)
  );
