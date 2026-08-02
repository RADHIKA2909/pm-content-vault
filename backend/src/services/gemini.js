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

export async function categorizeAndSummarize(text) {

  const prompt = `Classify this saved PM (Product Manager) interview-prep content.

Pick exactly one category from: ${CATEGORIES.join(', ')}.
If the category is "Interview Questions", also pick one subcategory from: ${INTERVIEW_SUBCATEGORIES.join(', ')}. Otherwise return an empty string for subcategory.
Write a 1-2 line summary of the content.
Write a very short title, 1-2 words (2 only if needed for clarity, e.g. "RCA Framework"), plain text, no punctuation — a punchy topic label shown as a bold card heading, not a description.
Write a short subtitle: a plain, lowercase-style phrase of AT MOST 5 SHORT words (prefer common short words over long ones), no trailing punctuation, that fits on one line without being cut off (e.g. "kpi trees and guesstimates" or "flowcharts for user navigation"). It must be short enough to read in full on a narrow card — do not write a sentence that needs truncating. Fewer words is better than more.

Respond with ONLY raw JSON, no markdown fences, in exactly this shape:
{"category": "...", "subcategory": "...", "summary": "...", "title": "...", "subtitle": "..."}

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
    subtitle: parsed.subtitle || null,
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

export async function generateGroundedAnswer(query, chunks) {

  const context = chunks.map((c, i) => `[${i + 1}] ${c.chunk_text}`).join('\n\n')

  const prompt = `Answer the question using ONLY the excerpts below from the user's own saved content.

Formatting rules:
- Use simple, plain language — write like you're explaining it to a friend, not writing a report.
- Use a short markdown bullet list when the answer has multiple distinct points, steps, or examples.
- Use 1-3 short plain sentences (no bullets) when the answer is a single, direct point.
- Never use headings or bold section labels.
- Cite excerpts inline like [1], [2], matching the excerpt numbers below.
- Only cite an excerpt if you actually used it — do not cite excerpts you didn't draw from.
- If the excerpts don't contain the answer, say so honestly in one short sentence instead of guessing.

Excerpts:
${context}

Question: ${query}`

  const data = await callGemini(TEXT_MODEL, { contents: [{ parts: [{ text: prompt }] }] })
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}
