-- Supports the guided Add Content flow, where the AI's suggestions are shown
-- for review *before* anything is written.
--
-- 1. key_points — the 3-5 bullet breakdown shown on the review step.
--
--    Kept separate from `summary` rather than replacing it. `summary` is a 1-2
--    line string that Library cards render inline; turning it into a bullet
--    list would break every card. These are the longer-form points, shown on
--    the review step and the item detail page.
--
-- 2. Job posting fields. A saved job posting has structure that a note doesn't
--    — the company, the role, when applications close. Packing those into free
--    text would make them searchable but never filterable, so they get real
--    columns. All nullable: only source_type = 'job' populates them.
--
-- 3. Two new source types. `source_type` is a closed CHECK constraint, so new
--    values have to be added to it explicitly (same as migrations 007 and 008).
--    'question' and 'job' are shapes of input, distinct from the taxonomy
--    *categories* of the same name — an interview question saved as a question
--    is still categorised "Interview Questions" like anything else.

alter table items add column if not exists key_points text[];

alter table items add column if not exists company text;
alter table items add column if not exists role text;
alter table items add column if not exists apply_url text;
alter table items add column if not exists salary text;
alter table items add column if not exists deadline date;

alter table items drop constraint if exists items_source_type_check;

alter table items add constraint items_source_type_check check (
  source_type in (
    'linkedin_paste',
    'whatsapp_export',
    'link',
    'pdf',
    'image',
    'note',
    'text',
    'question',
    'job'
  )
);
