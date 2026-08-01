import supabase from './supabaseClient.js'
import { categorizeAndSummarize, embedText } from './gemini.js'

const DUPLICATE_THRESHOLD = 0.92

// Runs categorization/summarization, embedding, and dedup-checking for one
// item. Best-effort: failures here (e.g. missing GEMINI_API_KEY) are logged,
// not thrown — the item itself is already saved regardless of enrichment.
export async function enrichItem(item) {
  const textToProcess = item.extracted_text
  if (!textToProcess || !textToProcess.trim()) return {}

  let categorization = {}

  try {
    const { category, subcategory, summary, title } = await categorizeAndSummarize(textToProcess)
    categorization = { category, subcategory, summary, title }
    await supabase.from('items').update(categorization).eq('id', item.id)
  } catch (err) {
    console.error(`Categorization failed for item ${item.id}:`, err.message)
  }

  try {
    const embedding = await embedText(textToProcess)
    if (!embedding) return

    // v0 embeds one chunk per item, so re-running enrichment (e.g. a
    // backfill after a transient failure) must replace, not duplicate, it.
    await supabase.from('embeddings').delete().eq('item_id', item.id)
    await supabase.from('embeddings').insert({
      item_id: item.id,
      user_id: item.user_id,
      chunk_text: textToProcess,
      embedding,
    })

    await checkForDuplicates(item, embedding)
  } catch (err) {
    console.error(`Embedding/dedup failed for item ${item.id}:`, err.message)
  }

  return categorization
}

async function checkForDuplicates(item, embedding) {
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: embedding,
    match_user_id: item.user_id,
    match_count: 3,
  })

  if (error) {
    console.error(`Dedup lookup failed for item ${item.id}:`, error.message)
    return
  }

  const match = data?.find((m) => m.item_id !== item.id && m.similarity >= DUPLICATE_THRESHOLD)
  if (!match) return

  await supabase.from('duplicates').insert({
    item_id: item.id,
    duplicate_of_item_id: match.item_id,
    user_id: item.user_id,
    similarity_score: match.similarity,
  })
}
