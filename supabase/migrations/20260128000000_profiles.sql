create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('manager', 'tutor', 'customer')),
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owners"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Managers can view all profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1
      from public.profiles as profiles
      where profiles.id = auth.uid()
        and profiles.role = 'manager'
    )
  );
