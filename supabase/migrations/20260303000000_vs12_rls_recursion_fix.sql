-- VS12: break students<->assignments RLS recursion by centralizing student location lookup

create or replace function public.location_id_for_student(student_uuid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select i.location_id
      from public.students st
      left join public.intakes i on i.id = st.intake_id
      where st.id = student_uuid
      limit 1
    ),
    public.default_location_id()
  );
$$;

drop policy if exists "Managers can create assignments" on public.assignments;
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
    and public.has_location(
      auth.uid(),
      public.location_id_for_student(student_id)
    )
  );

drop policy if exists "Managers can read all assignments" on public.assignments;
create policy "Managers can read all assignments"
  on public.assignments
  for select
  using (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      public.location_id_for_student(assignments.student_id)
    )
  );

drop policy if exists "Managers can update assignments" on public.assignments;
create policy "Managers can update assignments"
  on public.assignments
  for update
  using (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      public.location_id_for_student(assignments.student_id)
    )
  )
  with check (
    public.is_manager(auth.uid())
    and public.has_location(
      auth.uid(),
      public.location_id_for_student(assignments.student_id)
    )
  );

drop policy if exists "Tutors can read own assignments" on public.assignments;
create policy "Tutors can read own assignments"
  on public.assignments
  for select
  using (
    public.has_role(auth.uid(), 'tutor')
    and tutor_id = auth.uid()
    and public.has_location(
      auth.uid(),
      public.location_id_for_student(assignments.student_id)
    )
  );
