import { Router } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { insertItem, insertItems } from '../services/itemsRepo.js'
import { extractFromUrl } from '../services/linkExtractor.js'
import { parseWhatsappExport } from '../services/whatsappParser.js'
import { enrichItem } from '../services/enrichItem.js'
import supabase from '../services/supabaseClient.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// v0: no auth yet, so every item is saved under the fixed DEFAULT_USER_ID
// (see services/itemsRepo.js).

// Dashboard listing — optionally filtered by category.
router.get('/', async (req, res) => {
  const { category } = req.query

  let query = supabase
    .from('items')
    .select(
      'id, source_type, raw_content, summary, category, subcategory, created_at, last_engaged_at, tags(tag)',
    )
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .order('created_at', { ascending: false })

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  // Flag items detected as possible duplicates (see enrichItem.js) so the
  // dashboard can show "possible duplicate of X" instead of silently
  // logging it to the duplicates table.
  const { data: duplicateRows } = await supabase
    .from('duplicates')
    .select('item_id, duplicate_of_item_id, similarity_score')
    .eq('user_id', process.env.DEFAULT_USER_ID)

  const duplicateByItemId = new Map((duplicateRows || []).map((d) => [d.item_id, d]))
  const originalIds = (duplicateRows || []).map((d) => d.duplicate_of_item_id)

  const missingOriginalIds = originalIds.filter((id) => !data.some((item) => item.id === id))
  const { data: missingOriginals } = missingOriginalIds.length
    ? await supabase.from('items').select('id, summary').in('id', missingOriginalIds)
    : { data: [] }

  const summaryById = new Map([
    ...data.map((item) => [item.id, item.summary]),
    ...(missingOriginals || []).map((item) => [item.id, item.summary]),
  ])

  const withDuplicateFlags = data.map((item) => {
    const dup = duplicateByItemId.get(item.id)
    if (!dup) return item

    return {
      ...item,
      duplicateOf: {
        id: dup.duplicate_of_item_id,
        summary: summaryById.get(dup.duplicate_of_item_id) || null,
        similarity: dup.similarity_score,
      },
    }
  })

  res.json(withDuplicateFlags)
})

// Full detail for one item — source content, tags, duplicate info, and
// related items (via the same match_embeddings RPC used by chat/dedup).
router.get('/:id', async (req, res) => {
  const { id } = req.params
  const userId = process.env.DEFAULT_USER_ID

  const { data: item, error } = await supabase
    .from('items')
    .select(
      'id, source_type, raw_content, extracted_text, summary, category, subcategory, created_at, last_engaged_at, tags(tag)',
    )
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return res.status(404).json({ error: 'Item not found' })

  const [{ data: asDuplicate }, { data: duplicatesOfThis }, { data: embeddingRow }] = await Promise.all([
    supabase
      .from('duplicates')
      .select('duplicate_of_item_id, similarity_score')
      .eq('item_id', id)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('duplicates').select('item_id').eq('duplicate_of_item_id', id).eq('user_id', userId),
    supabase.from('embeddings').select('embedding').eq('item_id', id).eq('user_id', userId).maybeSingle(),
  ])

  let duplicateOf = null
  if (asDuplicate) {
    const { data: original } = await supabase
      .from('items')
      .select('id, summary')
      .eq('id', asDuplicate.duplicate_of_item_id)
      .single()
    duplicateOf = { id: original?.id, summary: original?.summary, similarity: asDuplicate.similarity_score }
  }

  let relatedItems = []
  if (embeddingRow?.embedding) {
    const { data: matches } = await supabase.rpc('match_embeddings', {
      query_embedding: embeddingRow.embedding,
      match_user_id: userId,
      match_count: 6,
    })

    const relatedIds = (matches || []).map((m) => m.item_id).filter((matchId) => matchId !== id)
    const uniqueRelatedIds = [...new Set(relatedIds)].slice(0, 5)

    if (uniqueRelatedIds.length) {
      const { data: relatedRows } = await supabase
        .from('items')
        .select('id, summary, category, source_type, created_at')
        .in('id', uniqueRelatedIds)
      relatedItems = relatedRows || []
    }
  }

  res.json({
    ...item,
    duplicateOf,
    duplicateCount: duplicatesOfThis?.length || 0,
    relatedItems,
  })
})

// Paste text (e.g. a LinkedIn post pasted manually).
router.post('/', async (req, res) => {
  const { text } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const item = await insertItem({
      sourceType: 'linkedin_paste',
      rawContent: text,
      extractedText: text,
    })
    const enrichment = await enrichItem(item)
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Paste a link — backend fetches the page and extracts title/body text.
router.post('/link', async (req, res) => {
  const { url } = req.body

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    const { extractedText } = await extractFromUrl(url)
    const item = await insertItem({
      sourceType: 'link',
      rawContent: url,
      extractedText,
    })
    const enrichment = await enrichItem(item)
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Image OCR — OCR runs client-side (Tesseract.js); backend just saves the
// resulting text. The image binary itself is not stored in v0.
router.post('/image', async (req, res) => {
  const { text, filename } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text (OCR result) is required' })
  }

  try {
    const item = await insertItem({
      sourceType: 'image',
      rawContent: filename || null,
      extractedText: text,
    })
    const enrichment = await enrichItem(item)
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PDF upload — text extraction happens server-side.
router.post('/pdf', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'file is required' })
  }

  try {
    const parsed = await pdfParse(req.file.buffer)
    const item = await insertItem({
      sourceType: 'pdf',
      rawContent: req.file.originalname,
      extractedText: parsed.text.slice(0, 20000),
    })
    const enrichment = await enrichItem(item)
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// WhatsApp "Export Chat" .txt upload — parsed client-side into raw text,
// parsed here into one item per message.
router.post('/whatsapp', async (req, res) => {
  const { text } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text (exported .txt contents) is required' })
  }

  const parsedMessages = parseWhatsappExport(text)

  if (parsedMessages.length === 0) {
    return res.status(400).json({ error: 'No parseable messages found in export' })
  }

  try {
    const items = await insertItems(parsedMessages)
    res.status(201).json({ count: items.length, items })

    // Enrichment runs in the background so bulk exports (which can be
    // hundreds of messages) don't block the HTTP response. Dashboard picks
    // up category/summary on next refresh once each item finishes.
    for (const item of items) {
      enrichItem(item).catch((err) =>
        console.error(`Background enrichment failed for item ${item.id}:`, err.message),
      )
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Tag an item (used for the "review before mock" priority flag).
router.post('/:id/tags', async (req, res) => {
  const { id } = req.params
  const { tag } = req.body

  if (!tag || !tag.trim()) {
    return res.status(400).json({ error: 'tag is required' })
  }

  const { data, error } = await supabase
    .from('tags')
    .insert({ item_id: id, user_id: process.env.DEFAULT_USER_ID, tag: tag.trim() })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Marks an item as engaged-with (viewed/revisited), resetting the
// resurfacing widget's 14-day idle clock for it.
router.patch('/:id/engage', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('items')
    .update({ last_engaged_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
