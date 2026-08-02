-- "Own content" notes: a freeform notepad item mixing text, pasted images and
-- links in one body, rather than being tied to a single imported source.
-- source_type is a closed CHECK list, so the new value has to be added to it.

alter table items drop constraint if exists items_source_type_check;

alter table items add constraint items_source_type_check check (
  source_type in ('linkedin_paste', 'whatsapp_export', 'link', 'pdf', 'image', 'note')
);
