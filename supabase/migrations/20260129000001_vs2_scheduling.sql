-- VS2 scheduling fields + RLS updates

alter table public.sessions
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists recurrence_rule text;

alter table public.sessions
  drop constraint if exists sessions_time_order_check;

alter table public.sessions
  add constraint sessions_time_order_check
  check (
    start_time is null
    or end_time is null
    or end_time > start_time
  );

create index if not exists sessions_session_date_start_time_idx
  on public.sessions (session_date, start_time);

create index if not exists sessions_tutor_date_start_time_idx
  on public.sessions (tutor_id, session_date, start_time);

-- RLS: tutors can only see their own sessions

drop policy if exists "Tutors can read sessions for assigned students" on public.sessions;

create policy "Tutors can read own sessions"
  on public.sessions
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and tutor_id = auth.uid()
  );
