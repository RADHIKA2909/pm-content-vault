-- PM Content Vault — v0 schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).
-- Mirrors the Data Model section of CLAUDE.md. Single-user for v0, but every
-- table carries user_id from day one so multi-user later isn't a rewrite.

create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────
-- items
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null check (
    source_type in ('linkedin_paste', 'whatsapp_export', 'link', 'pdf', 'image')
  ),
  raw_content text,
  extracted_text text,
  summary text,
  category text,
  subcategory text,
  created_at timestamptz not null default now(),
  last_engaged_at timestamptz
);

create index if not exists items_user_id_idx on items (user_id);
create index if not exists items_category_idx on items (category);

-- ─────────────────────────────────────────────────────────────────────────
-- embeddings
-- NOTE: vector(768) assumes gemini-embedding-001's default/truncated output
-- dimension. Confirm the exact dimension you request from the API before
-- running this in production — pgvector requires a fixed size per column.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists embeddings (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_text text,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists embeddings_item_id_idx on embeddings (item_id);
-- Vector similarity index — ivfflat needs data present to train well;
-- fine to create empty now, consider REINDEX or switching lists once you
-- have real data volume.
create index if not exists embeddings_embedding_idx
  on embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────
-- tags
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists tags (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now()
);

create index if not exists tags_item_id_idx on tags (item_id);

-- ─────────────────────────────────────────────────────────────────────────
-- duplicates
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists duplicates (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id) on delete cascade,
  duplicate_of_item_id uuid not null references items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  similarity_score float not null,
  created_at timestamptz not null default now()
);

create index if not exists duplicates_item_id_idx on duplicates (item_id);

-- ─────────────────────────────────────────────────────────────────────────
-- chat_queries (v0.1, optional per CLAUDE.md — included now so the RAG
-- chatbot step later doesn't need a schema migration)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists chat_queries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  query_text text not null,
  answer_text text,
  cited_item_ids uuid[],
  created_at timestamptz not null default now()
);

create index if not exists chat_queries_user_id_idx on chat_queries (user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security — scope every row to its owning user, from day one.
-- ─────────────────────────────────────────────────────────────────────────
alter table items enable row level security;
alter table embeddings enable row level security;
alter table tags enable row level security;
alter table duplicates enable row level security;
alter table chat_queries enable row level security;

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
