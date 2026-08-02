-- Categories become a list rather than a single value: an item carries one to
-- three, and the user can invent their own instead of being limited to the six
-- fixed taxonomy values.
--
-- items.category is kept as the primary (first) category so everything already
-- reading it — the classifier, the chat vault index, dedup — keeps working.
-- Both are written through one helper so they can't drift apart.

create table if not exists item_categories (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  created_at timestamptz not null default now()
);

create index if not exists item_categories_item_id_idx on item_categories (item_id);
create index if not exists item_categories_user_category_idx on item_categories (user_id, category);

-- Case-insensitive, so "Mock Prep" and "mock prep" don't both attach.
create unique index if not exists item_categories_unique
  on item_categories (item_id, lower(category));

alter table item_categories enable row level security;

drop policy if exists "item_categories_owner_only" on item_categories;
create policy "item_categories_owner_only" on item_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed from whatever each item is already categorised as, so nothing loses its
-- category in the move.
insert into item_categories (item_id, user_id, category, created_at)
select id, user_id, category, created_at
from items
where category is not null and trim(category) <> ''
on conflict do nothing;
