import { Router } from 'express'
import supabase from '../services/supabaseClient.js'
import { embedText, generateGroundedAnswer } from '../services/gemini.js'
import { sanitizeCitations, referencedIndexes } from '../services/citations.js'
import { loadVaultIndex } from '../services/vaultIndex.js'

const router = Router()

// Recent past questions — powers the Dashboard's "Continue your last chat" card.
router.get('/history', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_queries')
    .select('id, session_id, query_text, answer_text, cited_item_ids, created_at')
    .eq('user_id', process.env.DEFAULT_USER_ID)
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
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .order('updated_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// Every turn of one conversation, oldest first, so it replays in order.
router.get('/sessions/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('chat_queries')
    .select('id, query_text, answer_text, cited_item_ids, created_at')
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .eq('session_id', req.params.id)
    .order('created_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/sessions/:id', async (req, res) => {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('user_id', process.env.DEFAULT_USER_ID)
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

// Hybrid assistant: pgvector similarity search supplies citable excerpts, the
// vault index supplies collection-level awareness, and recent turns supply
// follow-up context. Gemini decides which of the three a message needs.
router.post('/', async (req, res) => {
  const { query, history, sessionId } = req.body

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    const userId = process.env.DEFAULT_USER_ID
    const activeSessionId = await resolveSession(userId, sessionId, query.trim())
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

    const recentHistory = (Array.isArray(history) ? history : [])
      .slice(-6)
      .filter((m) => m?.text && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => ({ role: m.role, text: m.text }))

    // Calibrated against real queries: topics the vault genuinely covers score
    // 0.70+, while unrelated ones sit around 0.45-0.49. Retrieval decides this,
    // not the model — it kept claiming a topic was missing while citing it.
    const VAULT_COVERAGE_THRESHOLD = 0.6
    const topSimilarity = matches.reduce((max, m) => Math.max(max, m.similarity ?? 0), 0)

    const rawAnswer = await generateGroundedAnswer(query, matches, {
      vaultIndex,
      history: recentHistory,
      covered: topSimilarity >= VAULT_COVERAGE_THRESHOLD,
    })

    const answer = sanitizeCitations(rawAnswer, matches.length)
    const referenced = referencedIndexes(answer)
    const relevantMatches = matches.filter((_, i) => referenced.has(i + 1))

    const itemIds = [...new Set(relevantMatches.map((m) => m.item_id))]
    const { data: items } = itemIds.length
      ? await supabase
          .from('items')
          .select('id, source_type, summary, category, created_at')
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

    await supabase.from('chat_queries').insert({
      user_id: userId,
      session_id: activeSessionId,
      query_text: query,
      answer_text: answer,
      cited_item_ids: itemIds,
    })

    // Bumped so the history list sorts by most recent activity, not by when
    // the conversation was first opened.
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeSessionId)

    res.json({ answer, citations, sessionId: activeSessionId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
