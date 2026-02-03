-- VS5 messaging tables + RLS

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students (id) on delete cascade,
  customer_id uuid not null references auth.users (id) on delete restrict,
  manager_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists message_threads_student_id_idx on public.message_threads (student_id);
create index if not exists message_threads_customer_id_idx on public.message_threads (customer_id);

create trigger set_message_threads_updated_at
  before update on public.message_threads
  for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_thread_id_created_at_idx
  on public.messages (thread_id, created_at);

create table if not exists public.message_read_state (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create index if not exists message_read_state_thread_id_idx on public.message_read_state (thread_id);
create index if not exists message_read_state_user_id_idx on public.message_read_state (user_id);

create trigger set_message_read_state_updated_at
  before update on public.message_read_state
  for each row execute function public.set_updated_at();

alter table public.message_threads enable row level security;
alter table public.messages enable row level security;
alter table public.message_read_state enable row level security;

-- message_threads policies
create policy "Managers can read all message threads"
  on public.message_threads
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can insert message threads"
  on public.message_threads
  for insert
  with check (public.is_manager(auth.uid()));

create policy "Managers can update message threads"
  on public.message_threads
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Managers can delete message threads"
  on public.message_threads
  for delete
  using (public.is_manager(auth.uid()));

create policy "Customers can read own message threads"
  on public.message_threads
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and customer_id = auth.uid()
    and (
      student_id is null
      or exists (
        select 1
        from public.students st
        where st.id = message_threads.student_id
          and st.customer_id = auth.uid()
      )
    )
  );

create policy "Customers can insert message threads"
  on public.message_threads
  for insert
  with check (
    public.has_role(auth.uid(), 'customer')
    and customer_id = auth.uid()
    and (
      student_id is null
      or exists (
        select 1
        from public.students st
        where st.id = student_id
          and st.customer_id = auth.uid()
      )
    )
  );

-- messages policies
create policy "Managers can read all messages"
  on public.messages
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can insert messages"
  on public.messages
  for insert
  with check (
    public.is_manager(auth.uid())
    and sender_id = auth.uid()
  );

create policy "Customers can read messages in own threads"
  on public.messages
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and exists (
      select 1
      from public.message_threads mt
      where mt.id = messages.thread_id
        and mt.customer_id = auth.uid()
    )
  );

create policy "Customers can insert messages in own threads"
  on public.messages
  for insert
  with check (
    public.has_role(auth.uid(), 'customer')
    and sender_id = auth.uid()
    and exists (
      select 1
      from public.message_threads mt
      where mt.id = thread_id
        and mt.customer_id = auth.uid()
    )
  );

-- message_read_state policies
create policy "Managers can read all message read state"
  on public.message_read_state
  for select
  using (public.is_manager(auth.uid()));

create policy "Managers can insert message read state"
  on public.message_read_state
  for insert
  with check (public.is_manager(auth.uid()));

create policy "Managers can update message read state"
  on public.message_read_state
  for update
  using (public.is_manager(auth.uid()))
  with check (public.is_manager(auth.uid()));

create policy "Customers can read own message read state"
  on public.message_read_state
  for select
  using (
    public.has_role(auth.uid(), 'customer')
    and user_id = auth.uid()
    and exists (
      select 1
      from public.message_threads mt
      where mt.id = message_read_state.thread_id
        and mt.customer_id = auth.uid()
    )
  );

create policy "Customers can insert own message read state"
  on public.message_read_state
  for insert
  with check (
    public.has_role(auth.uid(), 'customer')
    and user_id = auth.uid()
    and exists (
      select 1
      from public.message_threads mt
      where mt.id = thread_id
        and mt.customer_id = auth.uid()
    )
  );

create policy "Customers can update own message read state"
  on public.message_read_state
  for update
  using (
    public.has_role(auth.uid(), 'customer')
    and user_id = auth.uid()
  )
  with check (
    public.has_role(auth.uid(), 'customer')
    and user_id = auth.uid()
    and exists (
      select 1
      from public.message_threads mt
      where mt.id = message_read_state.thread_id
        and mt.customer_id = auth.uid()
    )
  );

-- NOTE: Tutors have no access to messaging by default (least privilege).
