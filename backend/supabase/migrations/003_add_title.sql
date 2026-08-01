-- Run this in the Supabase SQL editor AFTER schema.sql, 001, and 002.
-- Stores a short (4-6 word) AI-generated title per item, shown as a
-- bolded one-line label on Library/Favorites cards instead of a truncated
-- multi-line summary. The full summary still lives in `summary` and is
-- unaffected.
alter table items add column if not exists title text;
