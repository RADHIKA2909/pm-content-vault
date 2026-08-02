-- Tags are about to become a real user-facing feature rather than just the
-- storage for the `favorite` flag. Nothing stops the same tag being attached
-- to an item twice today — a double-clicked favourite star is enough to do it.

-- Collapse any existing duplicates first, keeping the oldest row of each set.
-- Matching is case-insensitive so "KPI Trees" and "kpi trees" count as one.
delete from tags t
using tags older
where t.item_id = older.item_id
  and lower(t.tag) = lower(older.tag)
  and t.created_at > older.created_at;

-- Same-timestamp collisions can't be ordered by created_at, so fall back to id.
delete from tags t
using tags older
where t.item_id = older.item_id
  and lower(t.tag) = lower(older.tag)
  and t.created_at = older.created_at
  and t.id > older.id;

create unique index if not exists tags_item_tag_unique on tags (item_id, lower(tag));
