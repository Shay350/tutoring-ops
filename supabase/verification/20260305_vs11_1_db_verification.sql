-- VS11.1 verification queries (run as each role JWT in SQL editor or psql session)
-- Replace placeholders with real UUIDs/emails from your seed/dev DB.
-- :admin_id, :manager_id, :customer_id, :target_profile_id, :invite_email

-- =====================
-- MANAGER: invite boundaries
-- =====================
-- Expect: manager can read invites
select email, role, created_by, used_at
from public.invites
order by created_at desc
limit 10;

-- Expect: manager can create customer invite
insert into public.invites (email, role, created_by)
values (:invite_email, 'customer', :manager_id)
on conflict (email) do update set role = excluded.role
returning email, role, created_by;

-- Expect: manager cannot create non-customer invite (RLS failure)
insert into public.invites (email, role, created_by)
values ('manager-should-fail@example.com', 'tutor', :manager_id);

-- Expect: manager cannot update invites (RLS failure)
update public.invites
set used_at = now(), used_by = :manager_id
where email = :invite_email
returning email;

-- =====================
-- MANAGER: location read-only boundaries
-- =====================
-- Expect: manager can read locations/profile_locations
select id, name, active from public.locations order by name;
select profile_id, location_id from public.profile_locations limit 20;

-- Expect: manager cannot mutate locations/profile_locations (RLS failure)
insert into public.locations (name, notes) values ('Manager Insert Should Fail', 'vs11.1 verify');
update public.locations set notes = 'manager update fail' where name = 'Default';
delete from public.locations where name = 'Manager Insert Should Fail';

insert into public.profile_locations (profile_id, location_id)
values (:manager_id, (select id from public.locations order by created_at asc limit 1));

-- =====================
-- ADMIN: full governance + safe role-change RPC
-- =====================
-- Expect: admin can create non-customer invite
insert into public.invites (email, role, created_by)
values ('admin-created-tutor@example.com', 'tutor', :admin_id)
on conflict (email) do update set role = excluded.role
returning email, role, created_by;

-- Expect: admin can mutate locations
insert into public.locations (name, notes)
values ('Admin Verify Temp', 'created by admin verify')
on conflict (name) do update set notes = excluded.notes
returning id, name;

update public.locations
set notes = 'admin update ok'
where name = 'Admin Verify Temp'
returning id, name, notes;

-- Expect: admin can role-change target profile and audit row is written
select (public.admin_change_user_role(:target_profile_id, 'tutor', 'vs11.1 verify demotion')).id;
select (public.admin_change_user_role(:target_profile_id, 'manager', 'vs11.1 verify promotion')).id;

select profile_id, old_role, new_role, changed_by, reason, changed_at
from public.profile_role_audit
where profile_id = :target_profile_id
order by changed_at desc
limit 10;

-- Expect: self-demotion blocked (exception)
select (public.admin_change_user_role(:admin_id, 'manager', 'self demotion should fail')).id;

-- Last-admin guard check (run only in dedicated test DB where this admin is last active admin)
-- Expect: exception "Cannot demote the last active admin."
-- select (public.admin_change_user_role(:admin_id, 'manager', 'last admin demotion should fail')).id;

-- Cleanup (optional)
delete from public.invites where email in (:invite_email, 'admin-created-tutor@example.com', 'manager-should-fail@example.com');
delete from public.locations where name = 'Admin Verify Temp';
