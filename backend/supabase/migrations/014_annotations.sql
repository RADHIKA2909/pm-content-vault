-- Turns the item detail page into a reading workspace: the imported content
-- becomes read-only source, and everything the user marks up lives here.
--
-- Why a separate table rather than rewriting the body (which is what
-- items.formatted_content did): a rewritten blob can't carry a note, a colour,
-- or an AI answer, can't be searched as "things I highlighted", and is
-- destroyed by any future re-import. Annotations survive all three.
--
-- ── Anchoring ────────────────────────────────────────────────────────────
-- start_offset/end_offset index into the *plain text* of the rendered body.
-- Offsets alone are brittle: any edit to the body shifts every annotation onto
-- the wrong words, silently, with nothing to error on. So each row also keeps
-- the exact `quote` plus a little surrounding context, and the renderer
-- verifies the offset still points at `quote` before drawing — repairing from
-- the quote/context when it doesn't, and reporting the annotation as orphaned
-- when it genuinely can't be found. A highlight that quietly lands on the
-- wrong sentence is worse than one that admits it lost its place.

create table if not exists annotations (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,

  start_offset integer not null,
  end_offset integer not null,
  quote text not null,
  -- ~24 characters either side, to disambiguate a quote that appears twice.
  prefix text,
  suffix text,

  type text not null check (
    type in ('highlight', 'bold', 'italic', 'underline', 'strikethrough', 'note', 'important', 'question')
  ),
  -- Highlights only; null for the formatting types.
  color text check (color is null or color in ('yellow', 'green', 'purple', 'blue')),
  note text,
  -- The AI action that produced this and its answer, when one did.
  ai_meta jsonb,

  created_at timestamptz not null default now(),

  constraint annotations_range_valid check (end_offset > start_offset)
);

create index if not exists annotations_item_id_idx on annotations (item_id);

alter table annotations enable row level security;

create policy "annotations_owner_only" on annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Item fields ──────────────────────────────────────────────────────────
-- The link extractor already parses a LinkedIn author but has nowhere to put
-- it (services/linkExtractor.js). Only populated for links saved from now on.
alter table items add column if not exists author text;

-- Timestamps rather than booleans, so "read on" and "archived on" stay
-- answerable without a second migration later.
alter table items add column if not exists read_at timestamptz;
alter table items add column if not exists archived_at timestamptz;

-- Archived items are filtered out of the Library, Dashboard counts and
-- related-item suggestions, so the partial index matches how they're queried.
create index if not exists items_active_idx on items (user_id, created_at desc)
  where archived_at is null;
