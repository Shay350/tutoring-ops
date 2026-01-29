-- VS3 progress tracking + at-risk fields + RLS updates

alter table public.progress_snapshots
  add column if not exists attendance_rate integer,
  add column if not exists homework_completion integer,
  add column if not exists last_session_delta integer,
  add column if not exists updated_at timestamptz not null default now();

alter table public.progress_snapshots
  drop constraint if exists progress_snapshots_attendance_rate_check;

alter table public.progress_snapshots
  add constraint progress_snapshots_attendance_rate_check
  check (attendance_rate is null or (attendance_rate >= 0 and attendance_rate <= 100));

alter table public.progress_snapshots
  drop constraint if exists progress_snapshots_homework_completion_check;

alter table public.progress_snapshots
  add constraint progress_snapshots_homework_completion_check
  check (
    homework_completion is null
    or (homework_completion >= 0 and homework_completion <= 100)
  );

alter table public.students
  add column if not exists at_risk boolean not null default false,
  add column if not exists at_risk_reason text;

create index if not exists students_at_risk_idx on public.students (at_risk);

-- RLS updates

drop policy if exists "Managers can update students" on public.students;

create policy "Managers can update students"
  on public.students
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Tutors can read progress snapshots for assigned students"
  on public.progress_snapshots
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = progress_snapshots.student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy "Tutors can create progress snapshots for assigned students"
  on public.progress_snapshots
  for insert
  with check (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy "Tutors can update progress snapshots for assigned students"
  on public.progress_snapshots
  for update
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = progress_snapshots.student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  )
  with check (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = progress_snapshots.student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );
