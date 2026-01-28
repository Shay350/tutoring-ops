do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('customer', 'tutor', 'manager');
  end if;
end$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_read_own" on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_manager_read_all" on public.profiles
  for select
  using (
    exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.role = 'manager'
    )
  );
