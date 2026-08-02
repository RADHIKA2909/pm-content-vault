-- Chat history needs a thread concept. Until now every chat_queries row was a
-- standalone Q&A pair, so a conversation with follow-ups had nothing tying its
-- turns together — a history list built on those rows would split one
-- conversation into several unrelated entries.

create table if not exists chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deleting a conversation takes its turns with it.
alter table chat_queries
  add column if not exists session_id uuid references chat_sessions (id) on delete cascade;

create index if not exists chat_queries_session_id_idx on chat_queries (session_id);
create index if not exists chat_sessions_user_updated_idx
  on chat_sessions (user_id, updated_at desc);

alter table chat_sessions enable row level security;

drop policy if exists "chat_sessions_owner_only" on chat_sessions;
create policy "chat_sessions_owner_only" on chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Existing questions predate sessions. Give each one its own single-turn
-- conversation so past chats still show up in the history list instead of
-- silently disappearing.
do $$
declare
  q record;
  new_session_id uuid;
begin
  for q in
    select id, user_id, query_text, created_at
    from chat_queries
    where session_id is null
    order by created_at
  loop
    insert into chat_sessions (user_id, title, created_at, updated_at)
    values (q.user_id, left(q.query_text, 80), q.created_at, q.created_at)
    returning id into new_session_id;

    update chat_queries set session_id = new_session_id where id = q.id;
  end loop;
end $$;
