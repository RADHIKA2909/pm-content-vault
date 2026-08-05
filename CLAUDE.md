# PM Content Vault — Build Brief (v0 / MVP)

## One-line summary
A personal tool that ingests saved PM-prep content (pasted text, links, images, PDFs, WhatsApp exports), auto-categorizes and summarizes it, lets you query it via a RAG chatbot with citations, and flags near-duplicates.

## The problem this solves (why we're building it this way)
PM-prep content gets saved across LinkedIn, WhatsApp groups, and random bookmarked links — with good intent, then it's rarely revisited. Even on the rare re-visit, it's hard to judge relevance without re-reading the whole thing, or to find the right saved item at all. Saved effort quietly gets wasted. This matters for architecture decisions: it's why summaries/gists are stored alongside full content (not a nice-to-have), and why "find the right thing fast" (RAG retrieval with citations) matters more than "store everything" (a plain folder/tagging app would already do that).

## Target user (wedge market)
Initial segment: **people preparing for product management interviews** — a narrow, well-defined group, reachable for real user research. This is a deliberate beachhead, not the ceiling: the broader vision (other exam-prep and professional upskilling communities generally) is a later-stage expansion, explicitly out of scope for v0.

## Why RAG (not fine-tuning or plain keyword search) — carry this reasoning into build decisions
- Keyword search fails on semantic queries like "that post about handling stakeholder conflict" where the user doesn't remember exact words.
- Fine-tuning is wasteful for personal, frequently-changing content — RAG lets new saves become queryable immediately with no retraining.
- Grounding answers in the user's own corpus with citations avoids hallucination — the point is trustworthy recall of *their own* material, not generic LLM knowledge. If a build decision ever trades citation accuracy for convenience, that's a red flag against this reasoning.

## Tech Stack
- **Frontend:** React (Vite) + Tailwind
- **Backend:** Lightweight Node/Express server (or Supabase Edge Functions) — needed so LLM API keys never live in the frontend
- **Database:** Supabase (Postgres) with the `pgvector` extension enabled
- **Auth:** Supabase Auth (email/password). Single user for v0, but every table should include `user_id` from day one so multi-user isn't a rewrite later
- **LLM (generation):** Google Gemini API (Gemini 2.5 Flash) for categorization, summarization, and RAG answer generation — free tier: 1,500 requests/day, no credit card required
- **Embeddings:** Google Gemini Embedding API (`gemini-embedding-001`) — also available on the free tier, used for the vectors stored in pgvector
- **OCR:** Tesseract.js (client-side) or a hosted OCR API, for WhatsApp-forwarded images
- **Hosting:** Vercel (frontend) + Supabase (DB/auth) + serverless functions for LLM calls

## MVP Scope Decisions (locked in, don't relitigate mid-build)
- **No live LinkedIn scraping.** Manual paste of post text or URL only — scraping your own saved posts violates LinkedIn's ToS.
- **No live WhatsApp listening.** User manually uses WhatsApp's built-in "Export Chat" feature and uploads the resulting `.txt` file, which gets parsed into individual items.
- **Single-user only** for v0 — no sharing/collaboration features yet.
- **Resurfacing is cut entirely** (decided 2026-08-06, after the other six features shipped). It was scoped as a rule-based "revisit" widget, and building it would have been cheap — the decision is that surfacing items on an age rule guesses at intent the product has no evidence for. Retrieval already answers "find the right thing fast"; a widget nagging about 14-day-old saves answers a question nobody asked. Revisit if usage ever shows people hunting for things they forgot they had.

## Data Model (tables)
- `items`: id, user_id, source_type (`linkedin_paste` / `whatsapp_export` / `link` / `pdf` / `image`), raw_content, extracted_text, summary, category, subcategory, created_at, last_engaged_at
- `embeddings`: item_id, embedding vector, chunk_text
- `tags`: item_id, tag
- `duplicates`: item_id, duplicate_of_item_id, similarity_score
- `chat_queries` (v0.1, optional): id, user_id, query_text, answer_text, cited_item_ids, created_at

## Taxonomy (fixed categories for v0 classification)
Interview Questions (Product Sense / RCA / Metrics / Strategy / Behavioral), Job Postings, Application Tips, Frameworks, Industry News, Other.

## Core Features — build in this order (one vertical slice at a time)
1. **Manual ingestion form** — paste text, paste link (fetch + extract title/body), upload image (OCR), upload PDF (text extraction), upload WhatsApp `.txt` export (parse into discrete items)
2. **Categorization + summarization pipeline** — on ingest, call the Gemini API to classify into the taxonomy above and generate a 1–2 line gist
3. **Embedding generation** — embed extracted text/gist, store in `embeddings` table via pgvector
4. **Dashboard view** — list/filter items by category, show gist + source + date
5. **RAG chatbot** — query box → embed query → pgvector similarity search (top-k) → Gemini generates an answer grounded in retrieved chunks, with citations linking back to the source item in the dashboard
6. **Dedup detection** — on ingest, compare new item's embedding against existing ones; flag as "possible duplicate of X" above a similarity threshold

## Explicitly deferred (do not build yet)
- LinkedIn/WhatsApp live sync or automated ingestion
- Multi-user accounts or sharing
- Resurfacing of any kind, rule-based or predictive (see the scope decision above)

**Stretch ideas — not built, but keep as interview talking points ("forward-thinking roadmap"):**
- An aggregate, anonymized "what's trending in PM prep this week" view across users — a network-effect/community growth angle worth mentioning in interviews even though it's not implemented, since it shows you've thought past the personal-tool stage.
- Expansion beyond PM-prep to other self-directed learning communities (exam prep, upskilling) — same idea, mention as vision, don't build.

## Platform: website (web app), not a native mobile app
This is a **React web app** — accessed through a browser, deployed on Vercel with a URL you can open on desktop or mobile browser. It is not a native iOS/Android app, and nothing here requires building one for v0. If you ever want it installable on a phone home screen later, that's a PWA wrapper — a small addition on top of the same web app, not a separate build.

## Honest cost breakdown — what's actually free vs. pay-per-use
Every piece of this stack has a genuine free tier at your usage scale — flagging the real caveats so there's no surprise later:

| Piece | Cost reality |
|---|---|
| **Supabase** (DB + auth + storage) | Free tier: 500MB DB, 1GB file storage, 50,000 MAUs, unlimited API requests — plenty for personal/portfolio scale. Free projects auto-pause after 7 days of inactivity (reopens automatically on next visit, no data loss, just a short delay). |
| **Vercel** (frontend hosting) | Free (Hobby) tier — fine for a personal project. |
| **Tesseract.js** (OCR) | Free, open-source, runs in-browser. |
| **Gemini API** (categorization, summarization, RAG answers) | Free tier: 1,500 requests/day, no credit card. Real caveat: on the free tier, Google may use your inputs to improve their models (this changes on the paid tier). Worth knowing since this holds your personal saved content — your call whether that's acceptable for a portfolio project. |
| **Gemini Embedding API** (RAG search) | Also free-tier eligible, same caveat as above. |

**Bottom line:** the entire stack — hosting, DB, auth, LLM calls, and embeddings — can run at $0/month at your usage scale. The only real tradeoff is the free-tier data-usage caveat above, and the fact that free quotas are rate-limited and can shift with little notice (worth a quick fallback plan, like Groq's free tier, if you ever hit a wall mid-build — not a concern to start with).

## How to use this with Claude Code
- Save this file as `CLAUDE.md` in your repo root — Claude Code reads it automatically at the start of every session, so you won't have to re-explain scope each time.
- First prompt: ask it to scaffold the Supabase schema, then build one feature at a time in the order above, testing each slice before moving to the next.
- Set Supabase URL/keys and your Gemini API key as environment variables — never paste them directly into a chat message.
