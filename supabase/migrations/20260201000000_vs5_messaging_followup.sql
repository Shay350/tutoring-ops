-- VS5 messaging follow-up: thread touch + indexes + verification notes

create or replace function public.touch_message_thread()
returns trigger
language plpgsql
as $$
begin
  update public.message_threads
    set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists touch_message_thread_updated_at on public.messages;
create trigger touch_message_thread_updated_at
  after insert on public.messages
  for each row execute function public.touch_message_thread();

create index if not exists message_threads_customer_id_updated_at_idx
  on public.message_threads (customer_id, updated_at desc);

-- Verification queries:
-- as manager:
-- select id, student_id, customer_id, updated_at from public.message_threads order by updated_at desc;
-- select thread_id, body, created_at from public.messages order by created_at desc;
-- select thread_id, user_id, last_read_at from public.message_read_state order by updated_at desc;
-- as customer:
-- select id from public.message_threads where customer_id = auth.uid();
-- insert into public.messages (thread_id, sender_id, body)
-- values ('<thread_id>', auth.uid(), 'Test message');
-- insert into public.message_read_state (thread_id, user_id, last_read_at)
-- values ('<thread_id>', auth.uid(), now())
-- on conflict (thread_id, user_id) do update set last_read_at = excluded.last_read_at;

-- Rollback notes:
-- drop trigger if exists touch_message_thread_updated_at on public.messages;
-- drop function if exists public.touch_message_thread();
-- drop index if exists message_threads_customer_id_updated_at_idx;
