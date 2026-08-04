import supabase from './supabaseClient.js'
import { categorizeAndSummarize, embedText } from './gemini.js'

const DUPLICATE_THRESHOLD = 0.92

// Runs categorization/summarization, embedding, and dedup-checking for one
// item. Best-effort: failures here (e.g. missing GEMINI_API_KEY) are logged,
// not thrown — the item itself is already saved regardless of enrichment.
// `skipSummary` lets the user opt out of AI categorization/summary (e.g. for
// images/PDFs they just want stored as-is) while embeddings still run so the
// item stays searchable via chat and dedup-checkable.
export async function enrichItem(item, { skipSummary = false, category: categoryOverride = null } = {}) {
  // Notes live in their own column but still feed summarization and search,
  // with the user's own framing first so it carries the most weight.
  const textToProcess = [item.notes, item.extracted_text].filter(Boolean).join('\n\n').trim()
  if (!textToProcess) return {}

  let categorization = {}
  let warning = null

  // A category the user picked themselves outranks the model's guess. Applied
  // as part of the same write rather than patched over afterwards.
  if (skipSummary && categoryOverride) {
    categorization = { category: categoryOverride }
    await supabase.from('items').update(categorization).eq('id', item.id)
  }

  if (!skipSummary) {
    try {
      const { category, subcategory, summary, title, subtitle } = await categorizeAndSummarize(textToProcess)
      // No spare column for a separate subtitle — pack "Title::subtitle" into
      // the existing `title` text field and split it back apart on read.
      const packedTitle = title && subtitle ? `${title}::${subtitle}` : title
      categorization = {
        category: categoryOverride || category,
        subcategory: categoryOverride ? null : subcategory,
        summary,
        title: packedTitle,
      }
      await supabase.from('items').update(categorization).eq('id', item.id)
    } catch (err) {
      console.error(`Categorization failed for item ${item.id}:`, err.message)
      // Surface this instead of silently saving a summary-less item — the
      // user explicitly asked for a summary, so they should know why it's
      // missing (usually a quota limit).
      if (err.name === 'QuotaExceededError') {
        warning = "Saved, but couldn't generate the AI summary — today's AI limit has been reached."
      } else if (err.name === 'ServiceBusyError') {
        warning = 'Saved, but the AI service was busy — the summary can be regenerated in a moment.'
      } else {
        warning = "Saved, but the AI summary couldn't be generated."
      }
    }
  }

  try {
    const embedding = await embedText(textToProcess)
    if (embedding) await persistEmbedding(item, textToProcess, embedding)
  } catch (err) {
    console.error(`Embedding/dedup failed for item ${item.id}:`, err.message)
  }

  return warning ? { ...categorization, warning } : categorization
}

/**
 * Stores an item's embedding and re-runs its duplicate check.
 *
 * Split out of enrichItem so the guided Add Content flow can reuse it: that
 * flow embeds during the pre-save analyze step, then commits with the
 * embedding already in hand, and must not pay for a second Gemini call just to
 * arrive back here.
 */
export async function persistEmbedding(item, chunkText, embedding) {
  // v0 embeds one chunk per item, so re-running (e.g. a backfill after a
  // transient failure) must replace, not duplicate, it.
  await supabase.from('embeddings').delete().eq('item_id', item.id)
  await supabase.from('embeddings').insert({
    item_id: item.id,
    user_id: item.user_id,
    chunk_text: chunkText,
    embedding,
  })

  await checkForDuplicates(item, embedding)
}

/**
 * Finds the nearest saved item to an embedding, for warning about duplicates
 * before anything is written.
 *
 * `excludeItemId` is null during the pre-save analyze step because the draft
 * has no row yet — there is no self to exclude.
 */
export async function findDuplicate(embedding, userId, excludeItemId = null) {
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: 3,
  })

  if (error) {
    console.error('Dedup lookup failed:', error.message)
    return null
  }

  return data?.find((m) => m.item_id !== excludeItemId && m.similarity >= DUPLICATE_THRESHOLD) || null
}

async function checkForDuplicates(item, embedding) {
  // Clear any prior verdict first — enrichment re-runs (backfills, edits)
  // would otherwise stack redundant rows and inflate the duplicate count.
  await supabase.from('duplicates').delete().eq('item_id', item.id)

  const match = await findDuplicate(embedding, item.user_id, item.id)
  if (!match) return

  await supabase.from('duplicates').insert({
    item_id: item.id,
    duplicate_of_item_id: match.item_id,
    user_id: item.user_id,
    similarity_score: match.similarity,
  })
}
