-- Two numbers the Library cards need, both already computed and thrown away.
--
-- page_count: pdf-parse returns `numpages` on every upload (routes/compose.js)
-- and nothing ever stored it. Same pattern as the similarity score that
-- match_embeddings was computing and discarding before migration 015's work.
--
-- word_count: derived from extracted_text, which the list endpoint
-- deliberately does NOT return — sending the full text of every saved article
-- to the browser so it can count words for a "5 min read" label would be
-- absurd. Counting once at save time is the only sensible place.
--
-- Both nullable: rows saved before this migration have no value until
-- scripts/backfillCardMetrics.js fills them in, and the cards drop any metric
-- whose value is missing rather than showing a zero.

alter table items add column if not exists page_count integer;
alter table items add column if not exists word_count integer;
