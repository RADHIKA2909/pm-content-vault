-- Run this in the Supabase SQL editor AFTER schema.sql, 001, 002, and 003.
-- Distinguishes what kind of link was saved (linkedin / blog / other) so
-- the UI can show a LinkedIn badge instead of a generic "Web" one. Only
-- meaningful when source_type = 'link'; null for every other source type.
alter table items add column if not exists link_type text;
