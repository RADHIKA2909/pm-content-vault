-- Run this in the Supabase SQL editor AFTER schema.sql and 001-004.
-- The user's own notes about an item, kept separate from extracted_text so
-- the detail view can show (and let them edit) their notes and the
-- auto-extracted source content as two distinct things. Both still feed
-- the embedding so search covers either.
alter table items add column if not exists notes text;
