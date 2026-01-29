-- VS1 core domain tables + RLS

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected')),
  student_name text not null,
  student_grade text,
  subjects text[] not null default '{}',
  availability text,
  goals text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists intakes_customer_id_idx on public.intakes (customer_id);
create index if not exists intakes_status_idx on public.intakes (status);

alter table public.intakes enable row level security;

create policy "Customers can create own intakes"
  on public.intakes
  for insert
  with check (
    public.has_role(auth.uid(), 'customer')
    and customer_id = auth.uid()
  );

create policy "Customers can read own intakes"
  on public.intakes
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and customer_id = auth.uid()
  );

create policy "Managers can read all intakes"
  on public.intakes
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can update all intakes"
  on public.intakes
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));


create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete restrict,
  intake_id uuid references public.intakes (id) on delete set null,
  full_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists students_customer_id_idx on public.students (customer_id);
create index if not exists students_status_idx on public.students (status);

alter table public.students enable row level security;

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
  );

create policy "Managers can read all students"
  on public.students
  for select
  using (public.is_manager(auth.uid()));

create policy "Customers can read own students"
  on public.students
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and customer_id = auth.uid()
  );

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
  );


create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  tutor_id uuid not null references auth.users (id) on delete restrict,
  assigned_by uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists assignments_student_id_idx on public.assignments (student_id);
create index if not exists assignments_tutor_id_idx on public.assignments (tutor_id);
create index if not exists assignments_status_idx on public.assignments (status);

alter table public.assignments enable row level security;

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
  );

create policy "Managers can read all assignments"
  on public.assignments
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can update assignments"
  on public.assignments
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Tutors can read own assignments"
  on public.assignments
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and tutor_id = auth.uid()
  );


create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  tutor_id uuid not null references auth.users (id) on delete restrict,
  created_by uuid references auth.users (id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'canceled')),
  session_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_student_id_idx on public.sessions (student_id);
create index if not exists sessions_tutor_id_idx on public.sessions (tutor_id);
create index if not exists sessions_status_idx on public.sessions (status);

alter table public.sessions enable row level security;

create policy "Managers can create sessions"
  on public.sessions
  for insert
  with check (
    public.is_manager(auth.uid())
    and exists (
      select 1
      from public.assignments a
      where a.student_id = student_id
        and a.tutor_id = tutor_id
        and a.status = 'active'
    )
  );

create policy "Managers can read all sessions"
  on public.sessions
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can update all sessions"
  on public.sessions
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Customers can read own sessions"
  on public.sessions
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.students s
      where s.id = sessions.student_id
        and s.customer_id = auth.uid()
    )
  );

create policy "Tutors can read sessions for assigned students"
  on public.sessions
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.assignments a
      where a.student_id = sessions.student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );


create table if not exists public.session_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  topics text,
  homework text,
  next_plan text,
  customer_summary text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id)
);

create index if not exists session_logs_session_id_idx on public.session_logs (session_id);

alter table public.session_logs enable row level security;

create policy "Managers can read all session logs"
  on public.session_logs
  for select
  using (public.is_manager(auth.uid()));

create policy "Customers can read own session logs"
  on public.session_logs
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.sessions se
      join public.students st on st.id = se.student_id
      where se.id = session_logs.session_id
        and st.customer_id = auth.uid()
    )
  );

create policy "Tutors can create session logs for assigned students"
  on public.session_logs
  for insert
  with check (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.sessions se
      join public.assignments a on a.student_id = se.student_id
      where se.id = session_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy "Tutors can update session logs for assigned students"
  on public.session_logs
  for update
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.sessions se
      join public.assignments a on a.student_id = se.student_id
      where se.id = session_logs.session_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  )
  with check (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.sessions se
      join public.assignments a on a.student_id = se.student_id
      where se.id = session_logs.session_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );

create policy "Tutors can read session logs for assigned students"
  on public.session_logs
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and exists (
      select 1
      from public.sessions se
      join public.assignments a on a.student_id = se.student_id
      where se.id = session_logs.session_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    )
  );


create table if not exists public.progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  sessions_completed integer not null default 0,
  last_session_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists progress_snapshots_student_id_idx on public.progress_snapshots (student_id);

alter table public.progress_snapshots enable row level security;

create policy "Managers can read all progress snapshots"
  on public.progress_snapshots
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can create progress snapshots"
  on public.progress_snapshots
  for insert
  with check (public.is_manager(auth.uid()));

create policy "Managers can update progress snapshots"
  on public.progress_snapshots
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Customers can read own progress snapshots"
  on public.progress_snapshots
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.students st
      where st.id = progress_snapshots.student_id
        and st.customer_id = auth.uid()
    )
  );
