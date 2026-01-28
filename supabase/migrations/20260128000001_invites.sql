alter table public.profiles
  add column if not exists email text,
  add column if not exists pending boolean not null default true;

update public.profiles
  set pending = false
  where pending is true;

create or replace function public.has_role(uid uuid, role text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = uid
      and role = $2
      and pending = false
  );
$$;

create or replace function public.is_manager(uid uuid)
returns boolean
language sql
stable
as $$
  select public.has_role(uid, 'manager');
$$;

drop policy if exists "Managers can view all profiles" on public.profiles;
create policy "Managers can view all profiles"
  on public.profiles
  for select
  using (public.is_manager(auth.uid()));

create table if not exists public.invites (
  email text primary key,
  role text not null check (role in ('manager', 'tutor', 'customer')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  used_at timestamptz,
  used_by uuid references auth.users (id)
);

alter table public.invites enable row level security;

create policy "Managers can view invites"
  on public.invites
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can create invites"
  on public.invites
  for insert
  with check (public.is_manager(auth.uid()));

create policy "Managers can update invites"
  on public.invites
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_record public.invites%rowtype;
  normalized_email text;
begin
  if new.email is null then
    return new;
  end if;

  normalized_email := lower(new.email);

  select *
    into invite_record
    from public.invites
    where email = normalized_email
      and used_at is null
    for update;

  if invite_record.email is not null then
    insert into public.profiles (id, email, role, pending)
    values (new.id, normalized_email, invite_record.role, false)
    on conflict (id) do update
      set email = excluded.email,
          role = excluded.role,
          pending = false;

    update public.invites
      set used_at = now(),
          used_by = new.id
      where email = invite_record.email;
  else
    insert into public.profiles (id, email, role, pending)
    values (new.id, normalized_email, 'customer', true)
    on conflict (id) do update
      set email = excluded.email,
          role = excluded.role,
          pending = true;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
