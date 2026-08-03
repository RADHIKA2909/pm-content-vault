-- ⚠ ALREADY APPLIED — DO NOT RUN AGAIN
--
-- The original vault was moved from user1@pmvault.com (f9e3b788-…acb60) to
-- the Google account (d2b08a82-…524030) on 2026-08-04, by running these same
-- updates through the service-role client rather than this file. 15 items,
-- 15 embeddings, 4 tags, 3 duplicates, 15 item_categories, 10 chat_sessions
-- and 19 chat_queries moved; nothing was left behind.
--
-- Kept as the record of how that was done, and as the recipe if a vault ever
-- needs moving between accounts again. Running it as-is does nothing: the
-- placeholder ids below trip the guard and roll back.
--
-- Moves an existing vault to the account you now sign in with.
--
-- ── Why this is needed ───────────────────────────────────────────────────
-- Everything saved before authentication belongs to the fixed DEFAULT_USER_ID.
-- Signing in with Google mints a *different* auth user, so the first thing you
-- would see after signing in is an empty vault — the rows are all still there,
-- just owned by someone else.
--
-- ── Before running ───────────────────────────────────────────────────────
-- 1. Sign in once, so the new account exists.
-- 2. Get the new id:   select id, email from auth.users order by created_at desc;
-- 3. If it already equals your old DEFAULT_USER_ID, Supabase linked the
--    identity by email and there is nothing to do — stop here.
-- 4. Otherwise paste both ids below and run the whole file in one go.
--
-- Write down the OLD id first. It is the only way to reverse this.

begin;

-- ─── Fill these in ───────────────────────────────────────────────────────
create temporary table reassign (old_owner uuid, new_owner uuid);
insert into reassign values (
  '00000000-0000-0000-0000-000000000000',  -- OLD: your DEFAULT_USER_ID
  '00000000-0000-0000-0000-000000000000'   -- NEW: the id from step 2
);
-- ─────────────────────────────────────────────────────────────────────────

-- Refuses to run against the placeholders, so a half-filled copy of this file
-- can't quietly do nothing and leave you thinking it worked.
do $$
declare o uuid; n uuid;
begin
  select old_owner, new_owner into o, n from reassign;
  if o = n then raise exception 'old and new owner are the same — nothing to do'; end if;
  if o = '00000000-0000-0000-0000-000000000000'::uuid
     or n = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'fill in both ids before running this migration';
  end if;
  if not exists (select 1 from auth.users where id = n) then
    raise exception 'the new owner does not exist in auth.users — sign in first';
  end if;
end $$;

-- Every table carrying user_id. chat_queries is included so past
-- conversations stay in the history list rather than vanishing.
update items          set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update embeddings     set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update tags           set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update duplicates     set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update item_categories set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update annotations    set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update chat_sessions  set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);
update chat_queries   set user_id = (select new_owner from reassign) where user_id = (select old_owner from reassign);

-- Nothing may be left behind under the old owner. If this raises, the
-- transaction rolls back and the vault is exactly as it was.
do $$
declare leftover int;
begin
  select
    (select count(*) from items          where user_id = (select old_owner from reassign)) +
    (select count(*) from embeddings     where user_id = (select old_owner from reassign)) +
    (select count(*) from tags           where user_id = (select old_owner from reassign)) +
    (select count(*) from duplicates     where user_id = (select old_owner from reassign)) +
    (select count(*) from item_categories where user_id = (select old_owner from reassign)) +
    (select count(*) from annotations    where user_id = (select old_owner from reassign)) +
    (select count(*) from chat_sessions  where user_id = (select old_owner from reassign)) +
    (select count(*) from chat_queries   where user_id = (select old_owner from reassign))
  into leftover;

  if leftover > 0 then
    raise exception 'still % rows under the old owner — rolling back', leftover;
  end if;
end $$;

-- What moved. Compare these against the counts you had before.
select 'items' as table_name, count(*) from items where user_id = (select new_owner from reassign)
union all select 'annotations', count(*) from annotations where user_id = (select new_owner from reassign)
union all select 'chat_sessions', count(*) from chat_sessions where user_id = (select new_owner from reassign)
union all select 'tags', count(*) from tags where user_id = (select new_owner from reassign);

commit;
