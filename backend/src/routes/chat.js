import { Router } from 'express'
import supabase from '../services/supabaseClient.js'
import { embedText, generateVaultAnswer } from '../services/gemini.js'
import { sanitizeCitations, referencedIndexes } from '../services/citations.js'
import { loadVaultIndex } from '../services/vaultIndex.js'

const router = Router()

// Recent past questions — powers the Dashboard's "Continue your last chat" card.
router.get('/history', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_queries')
    .select('id, session_id, query_text, answer_text, cited_item_ids, created_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Past conversations for the history panel, newest activity first.
router.get('/sessions', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, created_at, updated_at')
    .eq('user_id', req.userId)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Every turn of one conversation, oldest first, so it replays in order.
// answer_sections carries the structured version; turns saved before that
// column existed have null and replay as plain markdown, which is what they
// were.
router.get('/sessions/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_queries')
    .select('id, query_text, answer_text, answer_sections, cited_item_ids, citations, created_at')
    .eq('user_id', req.userId)
    .eq('session_id', req.params.id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/sessions/:id', async (req, res) => {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', req.userId)
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// The first question doubles as the conversation's name — cheaper and more
// predictable than spending a Gemini call on generating a title.
const MAX_TITLE_LENGTH = 80

async function resolveSession(userId, sessionId, firstQuery) {
  if (sessionId) return sessionId

  const title =
    firstQuery.length > MAX_TITLE_LENGTH
      ? `${firstQuery.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
      : firstQuery

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ user_id: userId, title })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

// What each kind of save is called when the answer reports what it read.
// "Used 5 saved resources · 3 notes, 1 PDF, 1 LinkedIn post" is the claim that
// makes the answer trustworthy, so the labels have to match what the user
// actually filed.
const SOURCE_LABEL = {
  note: ['note', 'notes'],
  pdf: ['PDF', 'PDFs'],
  image: ['image', 'images'],
  text: ['pasted note', 'pasted notes'],
  question: ['interview question', 'interview questions'],
  job: ['job posting', 'job postings'],
  whatsapp_export: ['WhatsApp message', 'WhatsApp messages'],
  linkedin_paste: ['LinkedIn post', 'LinkedIn posts'],
}

function sourceLabel(item, count) {
  if (item.source_type === 'link') {
    const pair = item.link_type === 'linkedin' ? SOURCE_LABEL.linkedin_paste : ['link', 'links']
    return count === 1 ? pair[0] : pair[1]
  }
  const pair = SOURCE_LABEL[item.source_type] || ['saved item', 'saved items']
  return count === 1 ? pair[0] : pair[1]
}

const FAVORITE_TAG = 'favorite'
const MAX_CONNECTED_IDEAS = 8

/**
 * What the answer was actually built from.
 *
 * Notes are the things the user wrote themselves; documents are everything
 * they saved from elsewhere. Highlights are counted separately and labelled
 * precisely in the UI: annotations aren't retrievable sources, so this is
 * "highlights that live on these sources", never "highlights the answer read".
 */
async function describeContext(items, itemIds, userId) {
  const { count: highlights } = itemIds.length
    ? await supabase
        .from('annotations')
        .select('id', { count: 'exact', head: true })
        .in('item_id', itemIds)
        .eq('user_id', userId)
    : { count: 0 }

  const byType = new Map()
  for (const item of items) {
    const key = item.source_type === 'link' ? `link:${item.link_type}` : item.source_type
    byType.set(key, [...(byType.get(key) || []), item])
  }

  return {
    notes: items.filter((i) => i.source_type === 'note').length,
    documents: items.filter((i) => i.source_type !== 'note').length,
    highlights: highlights || 0,
    breakdown: [...byType.values()]
      .map((group) => ({ label: sourceLabel(group[0], group.length), count: group.length }))
      .sort((a, b) => b.count - a.count),
  }
}

// The topics this answer touched, drawn from how the user already filed the
// cited items. Their own filing, not the model's opinion of what's related.
function connectedIdeas(items) {
  const seen = new Set()
  const ideas = []

  for (const item of items) {
    const labels = [
      item.category,
      item.subcategory,
      ...(item.item_categories || []).map((c) => c.category),
      ...(item.tags || []).map((t) => t.tag),
    ]

    for (const label of labels) {
      const clean = (label || '').trim()
      // "favorite" is a bookmark, not a topic — as an idea chip it says nothing.
      if (!clean || clean.toLowerCase() === FAVORITE_TAG) continue
      if (seen.has(clean.toLowerCase())) continue
      seen.add(clean.toLowerCase())
      ideas.push(clean)
    }
  }

  return ideas.slice(0, MAX_CONNECTED_IDEAS)
}

// Hybrid assistant: pgvector similarity search supplies citable excerpts, the
// vault index supplies collection-level awareness, and recent turns supply
// follow-up context. Gemini decides which of the three a message needs.
//
// Streamed as Server-Sent Events over POST, like routes/compose.js. The phases
// aren't decoration: retrieval, index loading and generation take visibly
// different amounts of time, and each event is emitted when that step actually
// finished. A progress indicator driven by a timer is one that lies whenever
// the model is slow.
router.post('/', async (req, res) => {
  const { query, history, sessionId, style } = req.body

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // Without this a proxy can hold the whole stream until it closes.
    'X-Accel-Buffering': 'no',
  })

  const send = (event, data) => res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`)

  try {
    const userId = req.userId
    const activeSessionId = await resolveSession(userId, sessionId, query.trim())

    send('phase', { phase: 'searching', status: 'active' })
    const queryEmbedding = await embedText(query)

    const [matchResult, vaultIndex] = await Promise.all([
      supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_user_id: userId,
        match_count: 5,
      }),
      loadVaultIndex(userId),
    ])

    if (matchResult.error) throw new Error(matchResult.error.message)
    const matches = matchResult.data || []
    send('phase', { phase: 'searching', status: 'done', matches: matches.length })
    send('phase', { phase: 'reading', status: 'done', indexed: vaultIndex.length })

    const recentHistory = (Array.isArray(history) ? history : [])
      .slice(-6)
      .filter((m) => m?.text && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({ role: m.role, text: m.text }))

    // Calibrated against real queries: topics the vault genuinely covers score
    // 0.70+, while unrelated ones sit around 0.45-0.49. Retrieval decides this,
    // not the model — it kept claiming a topic was missing while citing it.
    const VAULT_COVERAGE_THRESHOLD = 0.6
    const topSimilarity = matches.reduce((max, m) => Math.max(max, m.similarity ?? 0), 0)
    const covered = topSimilarity >= VAULT_COVERAGE_THRESHOLD
    send('phase', { phase: 'connecting', status: 'done', covered })

    send('phase', { phase: 'composing', status: 'active' })
    const raw = await generateVaultAnswer(query, matches, {
      vaultIndex,
      history: recentHistory,
      covered,
      // The user's Settings choice. Unknown values fall through to the
      // generator's default rather than being rejected — a stale preference
      // from an older build shouldn't fail the question.
      style,
    })
    send('phase', { phase: 'composing', status: 'done' })

    // Citation markers can appear in any section, so each is sanitized and all
    // of them count towards which excerpts were actually referenced.
    const sections = {
      overview: raw.overview ? sanitizeCitations(raw.overview, matches.length) : null,
      body: sanitizeCitations(raw.body || '', matches.length),
      cards: raw.cards.map((c) => ({
        ...c,
        description: sanitizeCitations(c.description, matches.length),
      })),
      takeaway: raw.takeaway ? sanitizeCitations(raw.takeaway, matches.length) : null,
      followUps: raw.followUps,
    }

    const cited = [sections.overview, sections.body, sections.takeaway]
      .concat(sections.cards.map((c) => c.description))
      .filter(Boolean)
      .join('\n')
    const referenced = referencedIndexes(cited)

    const itemIds = [...new Set(matches.filter((_, i) => referenced.has(i + 1)).map((m) => m.item_id))]
    const { data: items } = itemIds.length
      ? await supabase
          .from('items')
          .select(
            'id, source_type, link_type, title, summary, category, subcategory, thumbnail_url, file_url, raw_content, created_at, tags(tag), item_categories(category)',
          )
          .in('id', itemIds)
      : { data: [] }

    const citations = matches
      .map((m, i) => ({
        index: i + 1,
        item: items?.find((it) => it.id === m.item_id) || null,
        chunk_text: m.chunk_text,
        similarity: m.similarity,
      }))
      .filter((c) => referenced.has(c.index))

    // answer_text keeps the flat version so anything reading chat history
    // (the Dashboard's "continue learning" card) still works unchanged.
    //
    // The error is checked rather than ignored: a failed insert here loses the
    // turn while the answer still streams back perfectly, so the conversation
    // looks saved and reopens empty. The answer isn't worth failing over — the
    // user already has it — but it must not vanish quietly.
    const { error: saveError } = await supabase.from('chat_queries').insert({
      user_id: userId,
      session_id: activeSessionId,
      query_text: query,
      answer_text: [sections.overview, sections.body].filter(Boolean).join('\n\n'),
      answer_sections: sections,
      cited_item_ids: itemIds,
      // The ids alone can't be rehydrated faithfully: `index` is the item's
      // position in the retrieved set, which is what the answer's [n] markers
      // refer to, and `chunk_text` is the passage the answer actually used.
      // Both are unrecoverable from the item row afterwards. The item itself
      // is deliberately not stored — it can be edited or deleted, and a stale
      // copy would be worse than looking it up.
      citations: citations.map((c) => ({
        index: c.index,
        item_id: c.item?.id ?? null,
        chunk_text: c.chunk_text,
        similarity: c.similarity,
      })),
    })

    if (saveError) console.error('Chat turn was not saved:', saveError.message)

    // Bumped so the history list sorts by most recent activity, not by when
    // the conversation was first opened.
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeSessionId)

    send('result', {
      sessionId: activeSessionId,
      sections,
      citations,
      context: await describeContext(items || [], itemIds, userId),
      connectedIdeas: connectedIdeas(items || []),
    })
  } catch (err) {
    send('error', { message: err.message })
  } finally {
    res.end()
  }
})

export default router
