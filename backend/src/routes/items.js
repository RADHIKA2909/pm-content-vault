import { Router } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { insertItem, insertItems } from '../services/itemsRepo.js'
import { extractFromUrl } from '../services/linkExtractor.js'
import { parseWhatsappExport } from '../services/whatsappParser.js'
import { enrichItem } from '../services/enrichItem.js'
import { uploadFile } from '../services/fileStorage.js'
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
      'id, source_type, raw_content, file_url, link_type, notes, title, summary, category, subcategory, created_at, last_engaged_at, tags(tag)',
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
    ? await supabase.from('items').select('id, title, summary').in('id', missingOriginalIds)
    : { data: [] }

  const infoById = new Map([
    ...data.map((item) => [item.id, { title: item.title, summary: item.summary }]),
    ...(missingOriginals || []).map((item) => [item.id, { title: item.title, summary: item.summary }]),
  ])

  const withDuplicateFlags = data.map((item) => {
    const dup = duplicateByItemId.get(item.id)
    if (!dup) return item

    const original = infoById.get(dup.duplicate_of_item_id)
    return {
      ...item,
      duplicateOf: {
        id: dup.duplicate_of_item_id,
        title: original?.title || null,
        summary: original?.summary || null,
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
      'id, source_type, raw_content, extracted_text, file_url, link_type, notes, title, summary, category, subcategory, created_at, last_engaged_at, tags(tag)',
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
      .select('id, title, summary')
      .eq('id', asDuplicate.duplicate_of_item_id)
      .single()
    duplicateOf = {
      id: original?.id,
      title: original?.title,
      summary: original?.summary,
      similarity: asDuplicate.similarity_score,
    }
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
        .select('id, title, summary, category, source_type, created_at')
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
// User notes (optional) are prepended so their own framing takes priority
// over the auto-extracted page text in both the summary and search.
// linkType (linkedin/blog/other) drives the badge shown on the card; AI
// summary is opt-in, off by default, same as image/pdf/whatsapp.
router.post('/link', async (req, res) => {
  const { url, notes, linkType, generateSummary, skipFetch, manualContent } = req.body

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    let fetchedText = null
    let imageUrl = null

    if (manualContent?.trim()) {
      // User pasted the content themselves after a failed fetch.
      fetchedText = manualContent.trim()
    } else if (!skipFetch) {
      const result = await extractFromUrl(url)
      if (!result.ok) {
        // Not a hard error — hand the reason back so the user can choose to
        // save the bare link or paste the content in manually.
        return res.status(422).json({ fetchFailed: true, reason: result.reason })
      }
      fetchedText = result.extractedText
      imageUrl = result.imageUrl
    }

    const item = await insertItem({
      sourceType: 'link',
      rawContent: url,
      // Link-only saves still store the URL so the item stays searchable.
      extractedText: fetchedText || url,
      linkType: linkType || 'other',
      notes,
      // For links this is the post's own og:image, shown inline in detail.
      fileUrl: imageUrl,
    })
    const enrichment = await enrichItem(item, { skipSummary: generateSummary !== 'true' })
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Image OCR — OCR runs client-side (Tesseract.js) and the resulting text
// is sent alongside the original image file, which is stored so the user
// can view the exact image they saved later. User notes are optional and
// combine with OCR text; AI summary is opt-in (off by default) since the
// user may just want the image saved as-is.
router.post('/image', upload.single('file'), async (req, res) => {
  const { text, notes, generateSummary } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'file is required' })
  }

  if (!notes?.trim() && !text?.trim()) {
    return res.status(400).json({ error: 'Add a note, or make sure the image has readable text' })
  }

  try {
    const extension = req.file.originalname.split('.').pop() || 'png'
    const fileUrl = await uploadFile(req.file.buffer, extension, req.file.mimetype)

    const item = await insertItem({
      sourceType: 'image',
      rawContent: req.file.originalname,
      extractedText: text?.trim() || null,
      fileUrl,
      notes,
    })
    const enrichment = await enrichItem(item, { skipSummary: generateSummary !== 'true' })
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PDF upload — text extraction happens server-side. User notes are
// optional and combine with the extracted text; AI summary is opt-in.
router.post('/pdf', upload.single('file'), async (req, res) => {
  const { notes, generateSummary } = req.body

  if (!req.file) {
    return res.status(400).json({ error: 'file is required' })
  }

  try {
    const parsed = await pdfParse(req.file.buffer)
    const fileUrl = await uploadFile(req.file.buffer, 'pdf', 'application/pdf')

    const item = await insertItem({
      sourceType: 'pdf',
      rawContent: req.file.originalname,
      extractedText: parsed.text.slice(0, 20000),
      fileUrl,
      notes,
    })
    const enrichment = await enrichItem(item, { skipSummary: generateSummary !== 'true' })
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// WhatsApp "Export Chat" .txt upload — parsed client-side into raw text,
// parsed here into one item per message. AI summary is opt-in for the
// whole batch (applies to every parsed message).
router.post('/whatsapp', async (req, res) => {
  const { text, generateSummary } = req.body

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
      enrichItem(item, { skipSummary: generateSummary !== 'true' }).catch((err) =>
        console.error(`Background enrichment failed for item ${item.id}:`, err.message),
      )
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Tag an item (used for favorites and other free-form tags).
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

// Edit an item's summary and/or notes from the detail view. Re-embeds
// afterwards so edited text stays searchable and dedup stays accurate.
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { summary, notes } = req.body

  const updates = {}
  if (summary !== undefined) updates.summary = summary?.trim() || null
  if (notes !== undefined) updates.notes = notes?.trim() || null

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Refresh the embedding in the background — the user shouldn't wait on it.
  // skipSummary keeps their edited summary intact instead of regenerating it.
  enrichItem(data, { skipSummary: true }).catch((err) =>
    console.error(`Re-embed after edit failed for item ${id}:`, err.message),
  )

  res.json(data)
})

// Remove a specific tag from an item (e.g. un-favoriting
// once it's actually been reviewed).
router.delete('/:id/tags', async (req, res) => {
  const { id } = req.params
  const { tag } = req.body

  if (!tag || !tag.trim()) {
    return res.status(400).json({ error: 'tag is required' })
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('item_id', id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .eq('tag', tag.trim())

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
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

// Deletes an item permanently. embeddings/tags/duplicates rows referencing
// it are removed automatically via the schema's ON DELETE CASCADE.
router.delete('/:id', async (req, res) => {
  const { id } = req.params

  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', process.env.DEFAULT_USER_ID)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
