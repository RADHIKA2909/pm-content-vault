-- Row-level security on the five tables that never got it.
--
-- annotations, item_categories and chat_sessions have had owner-only policies
-- since they were created. items, embeddings, tags, duplicates and chat_queries
-- — the original five from schema.sql — have had none, so the anon key could
-- read every row in the vault if it were ever pointed at them directly.
--
-- ── What this is and isn't ───────────────────────────────────────────────
-- This is NOT what enforces access today. The API holds the service-role key,
-- which bypasses RLS entirely, and scoping comes from middleware/requireAuth.js
-- deriving the user from a Supabase-verified token.
--
-- It is the backstop for the case that key stops being the only client: the
-- browser now ships an anon key and a real session, so the database should be
-- able to defend itself without relying on every future query remembering to
-- filter by user_id.

alter table items enable row level security;
alter table embeddings enable row level security;
alter table tags enable row level security;
alter table duplicates enable row level security;
alter table chat_queries enable row level security;

-- `for all` covers select/insert/update/delete; `using` gates the rows you can
-- see and `with check` gates the rows you can write, so neither direction can
-- reach another account.
create policy "items_owner_only" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "embeddings_owner_only" on embeddings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tags_owner_only" on tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "duplicates_owner_only" on duplicates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chat_queries_owner_only" on chat_queries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
