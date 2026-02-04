-- Add short codes for nicer URLs

alter table public.intakes
  add column if not exists short_code text;

alter table public.students
  add column if not exists short_code text;

alter table public.sessions
  add column if not exists short_code text;

create unique index if not exists intakes_short_code_uidx
  on public.intakes (short_code)
  where short_code is not null;

create unique index if not exists students_short_code_uidx
  on public.students (short_code)
  where short_code is not null;

create unique index if not exists sessions_short_code_uidx
  on public.sessions (short_code)
  where short_code is not null;
