-- VS11.1 PR1: admin governance hardening (invites, location mutation boundaries, role-change guardrails)

-- 1) Invite boundaries
-- Managers can still view invites, but can only create customer invites.
-- Admins retain full governance over invite creation/update.

drop policy if exists "Managers can view invites" on public.invites;
create policy "Managers can view invites"
  on public.invites
  for select
  using (public.is_admin_or_manager(auth.uid()));

drop policy if exists "Managers can create invites" on public.invites;
create policy "Managers can create invites"
  on public.invites
  for insert
  with check (
    public.is_admin(auth.uid())
    or (
      public.is_manager(auth.uid())
      and role = 'customer'
    )
  );

-- Keep update authority admin-only.
drop policy if exists "Managers can update invites" on public.invites;
create policy "Managers can update invites"
  on public.invites
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 2) Locations/profile_locations manager access becomes read-only.

-- profile_locations: remove manager mutate policy, add manager read policy.
drop policy if exists "Managers can manage profile locations" on public.profile_locations;

drop policy if exists "Managers can read profile locations" on public.profile_locations;
create policy "Managers can read profile locations"
  on public.profile_locations
  for select
  using (public.is_manager(auth.uid()));

-- locations: remove manager mutate policies. keep manager+tutor assigned-location read policy.
drop policy if exists "Managers can insert locations" on public.locations;
drop policy if exists "Managers can update locations" on public.locations;
drop policy if exists "Managers can delete locations" on public.locations;

-- 3) Audit trail for admin role changes.
create table if not exists public.profile_role_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users (id) on delete cascade,
  old_role text not null check (old_role in ('admin', 'manager', 'tutor', 'customer')),
  new_role text not null check (new_role in ('admin', 'manager', 'tutor', 'customer')),
  changed_by uuid not null references auth.users (id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);

create index if not exists profile_role_audit_profile_changed_at_idx
  on public.profile_role_audit (profile_id, changed_at desc);

create index if not exists profile_role_audit_changed_by_changed_at_idx
  on public.profile_role_audit (changed_by, changed_at desc);

alter table public.profile_role_audit enable row level security;

-- Admin-only visibility into role audit entries.
drop policy if exists "Admins can read role audit" on public.profile_role_audit;
create policy "Admins can read role audit"
  on public.profile_role_audit
  for select
  using (public.is_admin(auth.uid()));

-- 4) Safe admin role-change RPC with self/last-admin protections + audit.
create or replace function public.admin_change_user_role(
  p_profile_id uuid,
  p_new_role text,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_current_role text;
  v_pending boolean;
  v_admin_count integer;
  v_result public.profiles%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if not public.is_admin(v_actor_id) then
    raise exception 'Only admins can change user roles.';
  end if;

  if p_new_role not in ('admin', 'manager', 'tutor', 'customer') then
    raise exception 'Invalid role: %', p_new_role;
  end if;

  select p.role, p.pending
    into v_current_role, v_pending
    from public.profiles p
    where p.id = p_profile_id
    for update;

  if not found then
    raise exception 'Profile not found for id: %', p_profile_id;
  end if;

  -- Prevent admins from demoting themselves.
  if p_profile_id = v_actor_id
     and v_current_role = 'admin'
     and p_new_role <> 'admin' then
    raise exception 'Admins cannot demote themselves.';
  end if;

  -- Prevent demoting/de-admining the last active admin.
  if v_current_role = 'admin' and p_new_role <> 'admin' and v_pending = false then
    select count(*)
      into v_admin_count
      from public.profiles p
      where p.role = 'admin'
        and p.pending = false;

    if v_admin_count <= 1 then
      raise exception 'Cannot demote the last active admin.';
    end if;
  end if;

  if v_current_role <> p_new_role then
    update public.profiles
      set role = p_new_role
      where id = p_profile_id
      returning * into v_result;

    insert into public.profile_role_audit (
      profile_id,
      old_role,
      new_role,
      changed_by,
      reason
    ) values (
      p_profile_id,
      v_current_role,
      p_new_role,
      v_actor_id,
      nullif(trim(coalesce(p_reason, '')), '')
    );
  else
    select *
      into v_result
      from public.profiles p
      where p.id = p_profile_id;
  end if;

  return v_result;
end;
$$;

grant execute on function public.admin_change_user_role(uuid, text, text)
  to authenticated;
