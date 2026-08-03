-- Lets the saved content itself be formatted — bold, underline, highlight — on
-- top of whatever was extracted from the source.
--
-- Kept separate from extracted_text rather than overwriting it: extracted_text
-- is the faithful capture from the original (and for links carries markdown
-- [label](url) anchors), while this holds the user's presentation of it.
-- Rendering prefers this when set, and falls back to the original otherwise.

alter table items add column if not exists formatted_content text;
