-- Precreate assignments table to avoid policy dependency errors in VS1 migration

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  tutor_id uuid not null references auth.users (id) on delete restrict,
  assigned_by uuid references auth.users (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);
