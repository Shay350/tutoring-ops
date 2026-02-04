-- Add missing student FK on assignments when precreated before VS1

do $$
begin
  if to_regclass('public.assignments') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'assignments_student_id_fkey'
        and conrelid = 'public.assignments'::regclass
    ) then
      alter table public.assignments
        add constraint assignments_student_id_fkey
        foreign key (student_id) references public.students (id) on delete cascade;
    end if;
  end if;
end $$;
