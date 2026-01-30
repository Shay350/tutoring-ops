-- VS3 progress snapshot updater function (handles multi-tutor visibility)

create or replace function public.upsert_progress_snapshot(
  p_student_id uuid,
  p_attendance_rate integer,
  p_homework_completion integer,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_sessions_completed integer := 0;
  v_last_session_at timestamptz;
  v_last_session_delta integer;
begin
  if public.is_manager(auth.uid()) then
    v_authorized := true;
  else
    v_authorized := exists (
      select 1
      from public.assignments a
      where a.student_id = p_student_id
        and a.tutor_id = auth.uid()
        and a.status = 'active'
    );
  end if;

  if not v_authorized then
    raise exception 'Not authorized to update progress snapshots.';
  end if;

  with logged_sessions as (
    select s.session_date::date as session_date
    from public.sessions s
    join public.session_logs sl on sl.session_id = s.id
    where s.student_id = p_student_id
      and s.session_date is not null
  ), ordered as (
    select
      session_date,
      lag(session_date) over (order by session_date desc) as prev_date,
      row_number() over (order by session_date desc) as rn
    from logged_sessions
  )
  select
    count(*)::integer,
    max(session_date)::timestamptz,
    max(
      case when rn = 1 and prev_date is not null then (session_date - prev_date) end
    )::integer
  into v_sessions_completed, v_last_session_at, v_last_session_delta
  from ordered;

  if exists (select 1 from public.progress_snapshots where student_id = p_student_id) then
    update public.progress_snapshots
      set sessions_completed = v_sessions_completed,
          last_session_at = v_last_session_at,
          attendance_rate = p_attendance_rate,
          homework_completion = p_homework_completion,
          last_session_delta = v_last_session_delta,
          notes = p_notes,
          updated_at = now()
      where student_id = p_student_id;
  else
    insert into public.progress_snapshots (
      student_id,
      sessions_completed,
      last_session_at,
      attendance_rate,
      homework_completion,
      last_session_delta,
      notes,
      updated_at
    ) values (
      p_student_id,
      v_sessions_completed,
      v_last_session_at,
      p_attendance_rate,
      p_homework_completion,
      v_last_session_delta,
      p_notes,
      now()
    );
  end if;
end;
$$;

grant execute on function public.upsert_progress_snapshot(uuid, integer, integer, text)
  to authenticated;
