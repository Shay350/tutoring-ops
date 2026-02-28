-- VS11 PR1: introduce first-class admin role + admin-aware RLS

-- 1) Role model: allow admin in role checks without forcing any conversions
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'tutor', 'customer'));

alter table public.invites
  drop constraint if exists invites_role_check;

alter table public.invites
  add constraint invites_role_check
  check (role in ('admin', 'manager', 'tutor', 'customer'));

-- 2) Helper functions: keep manager semantics manager-specific, add explicit admin helper
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select public.has_role(uid, 'admin');
$$;

create or replace function public.is_admin_or_manager(uid uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin(uid) or public.is_manager(uid);
$$;

-- 3) Invite authority becomes admin-only
-- Keep policy names stable to minimize downstream churn.
drop policy if exists "Managers can view invites" on public.invites;
create policy "Managers can view invites"
  on public.invites
  for select
  using (public.is_admin(auth.uid()));

drop policy if exists "Managers can create invites" on public.invites;
create policy "Managers can create invites"
  on public.invites
  for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "Managers can update invites" on public.invites;
create policy "Managers can update invites"
  on public.invites
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 4) Admin org-wide authority (additive policies)
-- profiles
create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin(auth.uid()));

-- profile_locations
create policy "Admins can manage profile locations"
  on public.profile_locations
  for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- locations
create policy "Admins can read all locations"
  on public.locations
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert locations"
  on public.locations
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update locations"
  on public.locations
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete locations"
  on public.locations
  for delete
  using (public.is_admin(auth.uid()));

-- intakes
create policy "Admins can read all intakes"
  on public.intakes
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update all intakes"
  on public.intakes
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- students
create policy "Admins can create students"
  on public.students
  for insert
  with check (
    public.is_admin(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = customer_id
        and p.role = 'customer'
        and p.pending = false
    )
  );

create policy "Admins can read all students"
  on public.students
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update students"
  on public.students
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- assignments
create policy "Admins can create assignments"
  on public.assignments
  for insert
  with check (
    public.is_admin(auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = tutor_id
        and p.role = 'tutor'
        and p.pending = false
    )
  );

create policy "Admins can read all assignments"
  on public.assignments
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update assignments"
  on public.assignments
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- sessions
create policy "Admins can create sessions"
  on public.sessions
  for insert
  with check (
    public.is_admin(auth.uid())
    and exists (
      select 1
      from public.assignments a
      where a.student_id = student_id
        and a.tutor_id = tutor_id
        and a.status = 'active'
    )
  );

create policy "Admins can read all sessions"
  on public.sessions
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update all sessions"
  on public.sessions
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- session_logs
create policy "Admins can read all session logs"
  on public.session_logs
  for select
  using (public.is_admin(auth.uid()));

-- progress_snapshots
create policy "Admins can read all progress snapshots"
  on public.progress_snapshots
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can create progress snapshots"
  on public.progress_snapshots
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update progress snapshots"
  on public.progress_snapshots
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- memberships
create policy "Admins can read all memberships"
  on public.memberships
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert memberships"
  on public.memberships
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update memberships"
  on public.memberships
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete memberships"
  on public.memberships
  for delete
  using (public.is_admin(auth.uid()));

-- membership_adjustments
create policy "Admins can read all membership adjustments"
  on public.membership_adjustments
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert membership adjustments"
  on public.membership_adjustments
  for insert
  with check (public.is_admin(auth.uid()));

-- messaging
create policy "Admins can read all message threads"
  on public.message_threads
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert message threads"
  on public.message_threads
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update message threads"
  on public.message_threads
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete message threads"
  on public.message_threads
  for delete
  using (public.is_admin(auth.uid()));

create policy "Admins can read all messages"
  on public.messages
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert messages"
  on public.messages
  for insert
  with check (public.is_admin(auth.uid()) and sender_id = auth.uid());

create policy "Admins can read all message read state"
  on public.message_read_state
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert message read state"
  on public.message_read_state
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update message read state"
  on public.message_read_state
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- slotting suggestions
create policy "Admins can read all slotting suggestions"
  on public.slotting_suggestions
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert slotting suggestions"
  on public.slotting_suggestions
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update slotting suggestions"
  on public.slotting_suggestions
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete slotting suggestions"
  on public.slotting_suggestions
  for delete
  using (public.is_admin(auth.uid()));

-- operating_hours
create policy "Admins can read all operating hours"
  on public.operating_hours
  for select
  using (public.is_admin(auth.uid()));

create policy "Admins can insert operating hours"
  on public.operating_hours
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update operating hours"
  on public.operating_hours
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Admins can delete operating hours"
  on public.operating_hours
  for delete
  using (public.is_admin(auth.uid()));
