-- Run this in the Supabase SQL editor AFTER schema.sql.
-- Nearest-neighbor lookup used by both the RAG chatbot (retrieval) and
-- dedup detection (checking a new item's embedding against existing ones).
create or replace function match_embeddings (
  query_embedding vector(768),
  match_user_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  item_id uuid,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    embeddings.id,
    embeddings.item_id,
    embeddings.chunk_text,
    1 - (embeddings.embedding <=> query_embedding) as similarity
  from embeddings
  where embeddings.user_id = match_user_id
  order by embeddings.embedding <=> query_embedding
  limit match_count;
$$;
