-- VS8 operating hours (global, single-org) + RLS

create table if not exists public.operating_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (weekday)
);

alter table public.operating_hours
  drop constraint if exists operating_hours_open_close_check;

alter table public.operating_hours
  add constraint operating_hours_open_close_check
  check (
    (is_closed and open_time is null and close_time is null)
    or
    (
      not is_closed
      and open_time is not null
      and close_time is not null
      and close_time > open_time
    )
  );

create index if not exists operating_hours_weekday_idx
  on public.operating_hours (weekday);

create trigger set_operating_hours_updated_at
  before update on public.operating_hours
  for each row execute function public.set_updated_at();

alter table public.operating_hours enable row level security;

drop policy if exists "Authenticated can read operating hours" on public.operating_hours;
create policy "Authenticated can read operating hours"
  on public.operating_hours
  for select
  using (auth.uid() is not null);

drop policy if exists "Managers can insert operating hours" on public.operating_hours;
create policy "Managers can insert operating hours"
  on public.operating_hours
  for insert
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can update operating hours" on public.operating_hours;
create policy "Managers can update operating hours"
  on public.operating_hours
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

drop policy if exists "Managers can delete operating hours" on public.operating_hours;
create policy "Managers can delete operating hours"
  on public.operating_hours
  for delete
  using (public.is_manager(auth.uid()));

-- Seed defaults (Mon-Fri 09:00-17:00; Sat/Sun closed). Idempotent via unique(weekday).
insert into public.operating_hours (weekday, is_closed, open_time, close_time)
values
  (0, true, null, null),
  (1, false, '09:00', '17:00'),
  (2, false, '09:00', '17:00'),
  (3, false, '09:00', '17:00'),
  (4, false, '09:00', '17:00'),
  (5, false, '09:00', '17:00'),
  (6, true, null, null)
on conflict (weekday) do nothing;

