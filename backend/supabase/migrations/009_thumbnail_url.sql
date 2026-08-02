-- PDFs need two URLs, not one: file_url points at the PDF itself (so "Open
-- original PDF" still works), while the Library card needs a rendered image of
-- its first page. Reusing file_url for the preview would break the link.
--
-- Kept generic rather than pdf-specific — any source type can supply a card
-- image here without another migration.

alter table items add column if not exists thumbnail_url text;
