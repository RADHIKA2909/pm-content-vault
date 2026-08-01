-- Run this in the Supabase SQL editor AFTER schema.sql and 001_match_embeddings.sql.
-- Stores a public URL to the originally uploaded file (image/PDF) in
-- Supabase Storage (bucket: vault-files), so users can view the exact file
-- they saved, not just its extracted text/summary.
alter table items add column if not exists file_url text;
