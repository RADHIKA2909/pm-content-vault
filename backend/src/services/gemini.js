const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
export const EMBEDDING_DIMENSIONS = 768

// flash-lite is built for high-volume classify/summarize work and has a far
// more generous free-tier daily quota than full flash (which caps at 20
// requests/day and gets exhausted almost immediately by any backfill).
const TEXT_MODEL = 'gemini-flash-lite-latest'

// Thrown when Gemini refuses due to quota so callers can tell the user
// "you hit today's limit" instead of silently producing no summary.
export class QuotaExceededError extends Error {
  constructor() {
    super("today's AI summary limit has been reached")
    this.name = 'QuotaExceededError'
  }
}

async function callGemini(model, body) {
  const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${requireApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (res.status === 429) throw new QuotaExceededError()
  if (!res.ok) {
    throw new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`)
  }

  return res.json()
}

// Fixed taxonomy from CLAUDE.md — do not let the model invent new categories.
export const CATEGORIES = [
  'Interview Questions',
  'Job Postings',
  'Application Tips',
  'Frameworks',
  'Industry News',
  'Other',
]
export const INTERVIEW_SUBCATEGORIES = [
  'Product Sense',
  'RCA',
  'Metrics',
  'Strategy',
  'Behavioral',
]

function requireApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  return key
}

// Only the first character — the rest keeps whatever casing it had, so
// "KPI trees" and "A/B testing" survive intact.
function capitalizeFirst(value) {
  const clean = (value || '').trim()
  return clean ? clean[0].toUpperCase() + clean.slice(1) : clean
}

export async function categorizeAndSummarize(text) {

  const prompt = `Classify this saved PM (Product Manager) interview-prep content.

Pick exactly one category from: ${CATEGORIES.join(', ')}.
If the category is "Interview Questions", also pick one subcategory from: ${INTERVIEW_SUBCATEGORIES.join(', ')}. Otherwise return an empty string for subcategory.
Write a 1-2 line summary of the content.
Write a very short title, 1-2 words (2 only if needed for clarity, e.g. "RCA Framework"), plain text, no punctuation — a punchy topic label shown as a bold card heading, not a description.
Write a short subtitle: a plain phrase of AT MOST 5 SHORT words (prefer common short words over long ones), starting with a capital letter, with no trailing punctuation, that fits on one line without being cut off (e.g. "KPI trees and guesstimates" or "Flowcharts for user navigation"). It must be short enough to read in full on a narrow card — do not write a sentence that needs truncating. Fewer words is better than more.
Write keyPoints: 3 to 5 bullet points capturing what this content actually says, each a complete sentence of at most 20 words. These are what the reader would want to recall without re-reading the original, so prefer specifics (a framework's steps, a metric, a concrete piece of advice) over generalities. If the content is too short to yield 3 distinct points, return fewer rather than padding.

Write categoryReason: one sentence, at most 25 words, saying why this content belongs in that category. Refer to what the content is actually about — "this walks through a prioritisation method rather than asking a question" — not to the category's own definition.

Respond with ONLY raw JSON, no markdown fences, in exactly this shape:
{"category": "...", "subcategory": "...", "summary": "...", "title": "...", "subtitle": "...", "keyPoints": ["...", "..."], "categoryReason": "..."}

Content:
"""
${text}
"""`

  const data = await callGemini(TEXT_MODEL, { contents: [{ parts: [{ text: prompt }] }] })
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  const cleaned = raw.trim().replace(/^```json\s*|```$/g, '')
  const parsed = JSON.parse(cleaned)

  return {
    category: parsed.category || 'Other',
    subcategory: parsed.subcategory || null,
    summary: parsed.summary || null,
    title: parsed.title || null,
    // Enforced here rather than trusted to the prompt — the model drifts back
    // to lowercase, and this is the value the review step shows for editing.
    subtitle: capitalizeFirst(parsed.subtitle) || null,
    // Defended rather than trusted: the model occasionally returns a single
    // string, or pads to the requested count with empties.
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.map((p) => String(p).trim()).filter(Boolean).slice(0, 5)
      : [],
    // The model's own account of why it picked that category. Post-hoc
    // rationalisation rather than a verified fact, so the UI attributes it to
    // the AI rather than stating it as true. Not stored — it explains a
    // decision at the moment it's made and is never read again afterwards.
    categoryReason: (parsed.categoryReason || '').trim() || null,
  }
}

export async function embedText(text) {
  const key = requireApiKey()

  const res = await fetch(`${GEMINI_BASE}/gemini-embedding-001:embedContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  })

  if (!res.ok) {
    throw new Error(`Gemini embedContent failed: ${res.status} ${await res.text()}`)
  }

  const data = await res.json()
  return data.embedding?.values ?? null
}

// Keeps the prompt from ballooning as the vault grows — the index is a
// scannable inventory, not the content itself (that's what excerpts are for).
const MAX_INDEX_SUMMARY = 120
const MAX_HISTORY_CHARS = 700

function truncate(text, max) {
  if (!text) return ''
  const clean = String(text).replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

function formatVaultIndex(vaultIndex) {
  if (!vaultIndex.length) return '(the vault is empty — nothing saved yet)'

  return vaultIndex
    .map((it) => {
      const category = [it.category, it.subcategory].filter(Boolean).join(' / ') || 'Uncategorised'
      const summary = truncate(it.summary, MAX_INDEX_SUMMARY)
      return `- [${category}] ${it.title || 'Untitled'}${summary ? ` — ${summary}` : ''}`
    })
    .join('\n')
}

function formatHistory(history) {
  if (!history.length) return '(this is the first message of the conversation)'

  return history
    .map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${truncate(m.text, MAX_HISTORY_CHARS)}`)
    .join('\n\n')
}

// Everything both assistants must obey, written once. The item-level chat and
// the vault-level chat differ only in the shape they return — letting each keep
// its own copy of the grounding rules is how the two slowly start behaving
// differently on the same question.
const ASSISTANT_ROLE = `You are the assistant inside "PM Content Vault" — a personal vault where the user saves Product Manager interview-prep content. You are their study partner: part librarian for what they've saved, part PM interview coach.

Work out which of these the message needs, and answer accordingly:

1. ABOUT SAVED CONTENT ("what have I saved about RCA?", "explain that metrics framework") — answer from the EXCERPTS and cite them inline like [1], [2].
2. ABOUT THE VAULT ITSELF ("what's in my vault?", "what topics do I have?", "what should I review?") — answer from the VAULT INDEX, which is the full list of what they've saved. Group by topic and describe each briefly. Do NOT put [n] citations on index entries — those numbers only ever refer to excerpts.
3. ANYTHING ELSE — general PM knowledge, interview practice, mock questions, feedback on an answer, follow-ups, or plain conversation. Just answer it well, like a knowledgeable PM coach would.

Rules:
- Never refuse a question just because the vault doesn't cover it. Answer it from your own knowledge instead.
- Before deciding something isn't in the vault, check the VAULT INDEX. If a listed item covers the topic, work from it and point the user to it — don't tell them they have nothing on a subject they've actually saved.
- When you genuinely are going beyond their saved content, lead with the help, not the gap: agree to help first, mention in passing that it isn't in their vault yet, then answer. Vary the wording naturally — for example "Happy to help with this. Worth flagging that you haven't saved anything on it yet, so this is from my own knowledge —" or "Sure, I can walk you through it. Quick note: this isn't in your vault yet." Never open with a bare "Not in your vault".
- Keep that note to one short clause. It's a passing aside, not a disclaimer paragraph, and it never appears more than once in an answer.
- Only mention the gap when the answer really is your own knowledge. If you're drawing on their saved content, don't bring it up at all.
- Never do both in one answer. If you cite even one excerpt, or lean on anything in the VAULT INDEX, then the topic IS in their vault — drop the note entirely. Saying "this isn't in your vault" next to a citation contradicts itself.
- When the vault partly covers it, lead with what they saved (cited), then add your own knowledge, clearly marked as such.
- Use CONVERSATION SO FAR to resolve follow-ups — "then what?", "explain more", "give me another" refer to the previous turn.
- Only cite an excerpt you actually used. Never invent a citation number that isn't listed below.
- Cite a source once, where you make the point. Don't repeat the same citation on every line.`

/**
 * The retrieved material, the inventory and the conversation — the three
 * things every answer is grounded in.
 */
function buildContext(query, chunks, { vaultIndex, history, covered, focusCount }) {
  const excerpts = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join('\n\n')
    : '(nothing saved matched this question)'

  // Set when the user is reading one specific item and asking about it, so the
  // model leads with that piece instead of treating every excerpt as equal.
  const focus = focusCount
    ? `\nThe user is reading one saved item right now. Excerpt${focusCount > 1 ? 's' : ''} [${
        focusCount > 1 ? `1]-[${focusCount}` : '1'
      }] ${focusCount > 1 ? 'are' : 'is'} that item — answer about it first. Later excerpts are other things they've saved; bring those in only when they add something, and say when you're doing so.\n`
    : ''

  // Asking the model to judge whether its own answer came from the vault
  // proved unreliable — it would flag a topic as missing while citing an
  // excerpt from it. Retrieval already knows the answer, so state it as fact.
  const coverage = covered
    ? `The user HAS saved material on this topic — it's in the excerpts below. Never tell them it isn't in their vault. If what they saved doesn't cover the exact thing they asked for, be precise about the difference rather than dismissive (e.g. "you've got a piece saved on product sense, though no practice questions yet — so here are some of mine"), and always point at what they do have.`
    : 'Nothing saved covers this specific question, so answer from your own knowledge and note that in one short clause. (Questions about the vault itself are the exception — answer those from the VAULT INDEX with no such note.)'

  return `VAULT COVERAGE (already determined — treat as fact, don't second-guess it):
${coverage}
${focus}

VAULT INDEX (everything the user has saved):
${formatVaultIndex(vaultIndex)}

RELEVANT EXCERPTS (retrieved for this question):
${excerpts}

CONVERSATION SO FAR:
${formatHistory(history)}

User's message: ${query}`
}

// The assistant is deliberately hybrid: grounded-with-citations when the vault
// covers the question, but still a useful PM coach when it doesn't. Refusing
// outright (the old behaviour) made it useless for meta questions like "what's
// in my vault" and for follow-ups, which retrieval alone can never answer.
export async function generateGroundedAnswer(
  query,
  chunks,
  { vaultIndex = [], history = [], covered = false, focusCount = 0 } = {},
) {
  const prompt = `${ASSISTANT_ROLE}

Formatting rules:
- Use simple, plain language — write like you're explaining it to a friend, not writing a report.
- Use a short markdown bullet list when the answer has multiple distinct points, steps, or examples.
- Use 1-3 short plain sentences (no bullets) when the answer is a single, direct point.
- A short bold lead-in inside a bullet is fine, but never use headings or standalone bold section labels.
- Square brackets are ONLY for excerpt citations. Never bracket a category name or any other label.

${buildContext(query, chunks, { vaultIndex, history, covered, focusCount })}`

  const data = await callGemini(TEXT_MODEL, { contents: [{ parts: [{ text: prompt }] }] })
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

const MAX_CARDS = 3
const MAX_FOLLOW_UPS = 4

function cleanString(value, max = 400) {
  const clean = typeof value === 'string' ? value.trim() : ''
  return clean ? clean.slice(0, max) : null
}

// The model reaches for "•" however plainly the prompt asks for "-", and a
// literal bullet character is not markdown: the renderer treats the line as a
// paragraph, so the list loses its indentation and its spacing.
const normalizeBullets = (markdown) => markdown.replace(/^[ \t]*[•·▪][ \t]+/gm, '- ')

/**
 * Salvages an answer from a response that didn't parse.
 *
 * Truncation mid-object is the realistic failure — a long answer runs past the
 * output limit and the closing brace never arrives — and by that point the
 * overview is usually complete. Pulling the finished string fields out beats
 * showing the user a fragment of JSON, which is what handing back the raw text
 * would do.
 */
function recoverSections(raw) {
  const grab = (key) => {
    const match = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
    if (!match) return null
    try {
      // Back through the JSON parser so escapes and newlines come out right.
      return JSON.parse(`"${match[1]}"`)
    } catch {
      return null
    }
  }

  const overview = cleanString(grab('overview'))
  const body = cleanString(grab('body'), 8000)
  const markdown = body ? normalizeBullets(body) : body
  const empty = { cards: [], takeaway: null, followUps: [] }

  if (overview || markdown) return { overview, body: markdown || '', ...empty }

  // Nothing JSON-shaped in there: the model answered in prose, which is
  // perfectly readable as-is.
  return { overview: null, body: normalizeBullets(raw.trim()), ...empty }
}

/**
 * The same assistant, returning sections instead of one block of prose.
 *
 * Ask My Vault renders each part differently — the overview as a lead, a
 * comparison as side-by-side cards, the takeaway as a callout — so the split
 * has to come from the model rather than from parsing headings back out of
 * markdown, which breaks the moment the model words a heading differently.
 *
 * Cards and takeaway are optional *in the prompt*, not just in the parser. An
 * answer to "what did I save about RCA?" has nothing to compare, and forcing
 * two cards there produces filler with a confident heading over it.
 */
export async function generateVaultAnswer(
  query,
  chunks,
  { vaultIndex = [], history = [], covered = false } = {},
) {
  const prompt = `${ASSISTANT_ROLE}

Return your answer as SECTIONS, described below. Same voice and same citation
discipline as always — simple language, cite excerpts inline as [1], [2].

- overview: 1-3 short sentences answering the question directly. This is read first and on its own, so it must stand alone. Never write "here's a guide to..." — just answer.
- body: the full answer in markdown. Short bullet lists for multiple points, 1-3 plain sentences for a single one. Start every bullet with "- " — never the "•" character, which renders as literal text rather than a list. A bold lead-in inside a bullet is fine; never use headings. Do NOT repeat the overview here.
- cards: ONLY when the answer genuinely compares two or more named approaches, frameworks or options (e.g. top-down vs bottom-up). 2 to ${MAX_CARDS} cards, each {"title", "description" (1-2 sentences), "highlight" (a 3-8 word note on when to use it)}. If the answer is not a comparison, return an empty array. Do not invent a comparison to fill this.
- takeaway: ONE sentence the user should remember, if there is a single such sentence. Otherwise return an empty string. Never restate the overview.
- followUps: 3 to ${MAX_FOLLOW_UPS} short next questions the user might ask, each at most 6 words, written as the user would type them ("Explain in simpler terms", "Quiz me on this"). Make them specific to this answer, not generic.

Respond with ONLY raw JSON, no markdown fences, in exactly this shape:
{"overview": "...", "body": "...", "cards": [{"title": "...", "description": "...", "highlight": "..."}], "takeaway": "...", "followUps": ["...", "..."]}

${buildContext(query, chunks, { vaultIndex, history, covered, focusCount: 0 })}`

  const data = await callGemini(TEXT_MODEL, { contents: [{ parts: [{ text: prompt }] }] })
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const cleaned = raw.trim().replace(/^```json\s*|```$/g, '')

  // Nothing came back at all — usually a safety block or a dropped response.
  // That's a failure, and the route should say so rather than render an empty
  // answer that looks like the assistant had nothing to say.
  if (!cleaned) throw new Error('The model returned an empty answer')

  try {
    const parsed = JSON.parse(cleaned)

    // Every field defended rather than trusted: the model returns a bare
    // string for `cards` often enough, and half-filled cards are common.
    const cards = Array.isArray(parsed.cards)
      ? parsed.cards
          .filter((c) => c && cleanString(c.title) && cleanString(c.description))
          .slice(0, MAX_CARDS)
          .map((c) => ({
            title: cleanString(c.title, 60),
            description: cleanString(c.description),
            highlight: cleanString(c.highlight, 60),
          }))
      : []

    const overview = cleanString(parsed.overview)
    const body = normalizeBullets(cleanString(parsed.body, 8000) || '')

    // Valid JSON with the wrong types in it parses cleanly and leaves nothing
    // to render — a blank answer bubble, which looks like the assistant simply
    // failed. Recovery reads the same response as text instead.
    if (!overview && !body) return recoverSections(cleaned)

    return {
      overview,
      body,
      // One card is a comparison against nothing. If only a single card
      // survived validation, the answer wasn't a comparison in the first place.
      cards: cards.length >= 2 ? cards : [],
      takeaway: cleanString(parsed.takeaway),
      followUps: Array.isArray(parsed.followUps)
        ? parsed.followUps.map((f) => cleanString(f, 60)).filter(Boolean).slice(0, MAX_FOLLOW_UPS)
        : [],
    }
  } catch {
    // A malformed response still contains the answer somewhere. Losing the
    // sections is acceptable; losing the reply is not.
    return recoverSections(cleaned)
  }
}
