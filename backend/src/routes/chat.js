import { Router } from 'express'
import supabase from '../services/supabaseClient.js'
import { embedText, generateGroundedAnswer } from '../services/gemini.js'

const router = Router()

// RAG chatbot: embed the query, pgvector similarity search (top-k) via the
// match_embeddings function, then ask Gemini to answer grounded in those
// chunks, with citations back to the source items.
router.post('/', async (req, res) => {
  const { query } = req.body

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    const userId = process.env.DEFAULT_USER_ID
    const queryEmbedding = await embedText(query)

    const { data: matches, error: matchError } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: 5,
    })

    if (matchError) throw new Error(matchError.message)

    if (!matches || matches.length === 0) {
      return res.json({
        answer: "I don't have any saved content to answer that yet — save a few items first.",
        citations: [],
      })
    }

    const answer = await generateGroundedAnswer(query, matches)

    // Only surface citations the model actually referenced inline (e.g. "[1]"),
    // not every chunk that was retrieved — retrieval often pulls in
    // low-relevance chunks the model correctly ignored.
    const referencedIndexes = new Set(
      [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
    )
    const relevantMatches = matches.filter((_, i) => referencedIndexes.has(i + 1))

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
      .filter((c) => referencedIndexes.has(c.index))

    await supabase.from('chat_queries').insert({
      user_id: userId,
      query_text: query,
      answer_text: answer,
      cited_item_ids: [...new Set(matches.map((m) => m.item_id))],
    })

    res.json({ answer, citations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
