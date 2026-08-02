-- The "Paste text" tab was writing source_type = 'linkedin_paste', so anything
-- pasted into it — a note to self, a blog excerpt, anything at all — showed up
-- in the UI badged as LinkedIn. That mapping made sense when pasting LinkedIn
-- posts was the only text path; it isn't any more.

alter table items drop constraint if exists items_source_type_check;

alter table items add constraint items_source_type_check check (
  source_type in ('linkedin_paste', 'whatsapp_export', 'link', 'pdf', 'image', 'note', 'text')
);

-- Every existing 'linkedin_paste' row came through the "Paste text" tab —
-- it's the only code path that ever wrote that value. Genuine LinkedIn saves
-- go in as source_type 'link' with link_type 'linkedin'. So relabelling these
-- as plain text is a correction, not a guess.
--
-- 'linkedin_paste' stays in the CHECK list above: it's part of the documented
-- data model, and dropping a value a future import might use isn't worth it.
update items set source_type = 'text' where source_type = 'linkedin_paste';
