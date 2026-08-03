import { Router } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import { insertItem, insertItems } from '../services/itemsRepo.js'
import { extractFromUrl, fetchPageImage } from '../services/linkExtractor.js'
import { parseWhatsappExport } from '../services/whatsappParser.js'
import { enrichItem } from '../services/enrichItem.js'
import { CATEGORIES, embedText, generateGroundedAnswer } from '../services/gemini.js'
import { sanitizeCitations, referencedIndexes } from '../services/citations.js'
import { loadVaultIndex } from '../services/vaultIndex.js'
import { uploadFile } from '../services/fileStorage.js'
import {
  sanitizeNoteHtml,
  noteHtmlToText,
  firstImageUrl,
  firstLinkUrl,
  htmlToStructuredText,
} from '../services/noteContent.js'
import supabase from '../services/supabaseClient.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// v0: no auth yet, so every item is saved under the fixed DEFAULT_USER_ID
// (see services/itemsRepo.js).

function normalizeLabel(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

// An item carries between one and three categories. The cap keeps cards
// readable; the floor means nothing is ever left unfiled.
const MAX_CATEGORIES = 3
const FALLBACK_CATEGORY = 'Other'

// Accepts a real array (JSON routes) or a JSON string (multipart forms, which
// can only carry strings).
function parseCategories(categories) {
  const raw = Array.isArray(categories)
    ? categories
    : (() => {
        if (typeof categories !== 'string' || !categories.trim()) return []
        try {
          const parsed = JSON.parse(categories)
          return Array.isArray(parsed) ? parsed : []
        } catch {
          return categories.split(',')
        }
      })()

  // De-duplicated case-insensitively, so "Mock Prep" and "mock prep" can't both
  // land on the same item.
  const seen = new Set()
  return raw
    .map(normalizeLabel)
    .filter((c) => c && !seen.has(c.toLowerCase()) && seen.add(c.toLowerCase()))
    .slice(0, MAX_CATEGORIES)
}

/**
 * Replaces an item's categories wholesale, and mirrors the first one onto
 * items.category. That column stays the primary category for everything that
 * still reads a single value (the classifier, chat's vault index, dedup) —
 * writing both here is what stops the two representations drifting apart.
 */
async function setCategories(itemId, categories) {
  const list = categories.length ? categories.slice(0, MAX_CATEGORIES) : [FALLBACK_CATEGORY]

  await supabase.from('item_categories').delete().eq('item_id', itemId)
  await supabase.from('item_categories').insert(
    list.map((category) => ({ item_id: itemId, user_id: process.env.DEFAULT_USER_ID, category })),
  )
  await supabase.from('items').update({ category: list[0] }).eq('id', itemId)

  return list
}

/**
 * Attaches tags to an item, skipping any it already carries.
 *
 * Uniqueness is enforced by `tags_item_tag_unique on tags (item_id, lower(tag))`
 * (migration 010). That's an expression index, which PostgREST's upsert can't
 * target — `ON CONFLICT` needs a plain column list — so the check is done here
 * instead, case-insensitively to match the index.
 *
 * The read-then-insert is not atomic, so a genuine race can still hit the
 * index. A unique violation means the tag is now present, which is exactly what
 * the caller asked for, so it's swallowed rather than surfaced as a failure.
 */
async function addTags(itemId, tags) {
  const wanted = [...new Set(tags.map((t) => t.trim()).filter(Boolean))]
  if (!wanted.length) return { error: null }

  const { data: existing, error: readError } = await supabase
    .from('tags')
    .select('tag')
    .eq('item_id', itemId)
    .eq('user_id', process.env.DEFAULT_USER_ID)

  if (readError) return { error: readError }

  const have = new Set((existing || []).map((row) => row.tag.toLowerCase()))
  const missing = wanted.filter((tag) => !have.has(tag.toLowerCase()))
  if (!missing.length) return { error: null }

  const { error } = await supabase
    .from('tags')
    .insert(missing.map((tag) => ({ item_id: itemId, user_id: process.env.DEFAULT_USER_ID, tag })))

  if (error && error.code === '23505') return { error: null }
  return { error }
}

// Title and subtitle live in one column as "Title::subtitle" (see
// services/enrichItem.js) — packed on write, split on read by the frontend.
function packTitle(title, subtitle) {
  const cleanTitle = (title || '').trim()
  const cleanSubtitle = (subtitle || '').trim()
  if (!cleanTitle) return null
  return cleanSubtitle ? `${cleanTitle}::${cleanSubtitle}` : cleanTitle
}

// Headline counts for "your vault at a glance" in Ask My Vault.
//
// Notes counts the pieces the user wrote themselves, not everything with a
// note attached — the panel sits beside an assistant claiming to reason over
// their knowledge, so "notes" has to mean their own words.
//
// Declared before GET /:id, same as /categories below, or Express matches
// "stats" as an item id.
router.get('/stats', async (req, res) => {
  const userId = process.env.DEFAULT_USER_ID

  const [{ data: items }, { count: highlights }] = await Promise.all([
    supabase.from('items').select('source_type, category').eq('user_id', userId).is('archived_at', null),
    supabase.from('annotations').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const rows = items || []

  res.json({
    items: rows.length,
    notes: rows.filter((i) => i.source_type === 'note').length,
    highlights: highlights || 0,
    categories: new Set(rows.map((i) => i.category).filter(Boolean)).size,
  })
})

// Every category available to pick from: the fixed taxonomy plus any the user
// has invented, with usage counts.
// Declared before GET /:id, or Express matches "categories" as an item id.
router.get('/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('item_categories')
    .select('category')
    .eq('user_id', process.env.DEFAULT_USER_ID)

  if (error) return res.status(500).json({ error: error.message })

  const counts = new Map(CATEGORIES.map((c) => [c, 0]))
  for (const { category } of data || []) {
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  res.json(
    [...counts.entries()]
      .map(([category, count]) => ({ category, count, custom: !CATEGORIES.includes(category) }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
  )
})

// Dashboard listing — optionally filtered by category.
//
// Archived items are excluded unless asked for. Archiving is meant to take an
// item out of sight everywhere at once, so the default has to be the quiet one
// — the Dashboard's counts would otherwise keep counting things the user has
// explicitly put away. `?archived=include` is what the Library uses, so its
// Archived filter can toggle without a refetch.
router.get('/', async (req, res) => {
  const { category, archived } = req.query

  let query = supabase
    .from('items')
    .select(
      'id, source_type, raw_content, file_url, thumbnail_url, link_type, notes, title, summary, author, category, subcategory, created_at, last_engaged_at, read_at, archived_at, tags(tag, created_at), item_categories(category, created_at)',
    )
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .order('created_at', { ascending: false })

  if (archived === 'only') query = query.not('archived_at', 'is', null)
  else if (archived !== 'include') query = query.is('archived_at', null)

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
      'id, source_type, raw_content, extracted_text, formatted_content, file_url, thumbnail_url, link_type, notes, title, summary, key_points, author, company, role, apply_url, salary, deadline, category, subcategory, created_at, last_engaged_at, read_at, archived_at, tags(tag, created_at), item_categories(category, created_at)',
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

    // The RPC returns a similarity per chunk and an item can have several, so
    // each item keeps its best-matching chunk's score. That number was being
    // computed and thrown away — showing it is what turns "Related items" from
    // an unexplained list into a ranked one.
    const bestByItem = new Map()
    for (const match of matches || []) {
      if (match.item_id === id) continue
      const best = bestByItem.get(match.item_id)
      if (!best || match.similarity > best) bestByItem.set(match.item_id, match.similarity)
    }

    const uniqueRelatedIds = [...bestByItem.keys()].slice(0, 5)

    if (uniqueRelatedIds.length) {
      const { data: relatedRows } = await supabase
        .from('items')
        .select('id, title, summary, category, source_type, link_type, file_url, thumbnail_url, created_at')
        .in('id', uniqueRelatedIds)
        // Archiving takes an item out of sight everywhere, suggestions
        // included — otherwise it comes straight back through the side door.
        .is('archived_at', null)

      relatedItems = (relatedRows || [])
        .map((row) => ({ ...row, similarity: bestByItem.get(row.id) }))
        .sort((a, b) => b.similarity - a.similarity)
    }
  }

  res.json({
    ...item,
    duplicateOf,
    duplicateCount: duplicatesOfThis?.length || 0,
    relatedItems,
  })
})

// Paste text (e.g. a LinkedIn post pasted manually). Notes are optional
// and stored separately; AI summary is opt-in, same as every other source.
router.post('/', async (req, res) => {
  const { text, notes, generateSummary, categories } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const item = await insertItem({
      // Plain pasted text. Not 'linkedin_paste' — that badged every paste as
      // LinkedIn regardless of where it actually came from.
      sourceType: 'text',
      rawContent: text,
      extractedText: text,
      notes,
    })
    const chosen = parseCategories(categories)
    const enrichment = await enrichItem(item, {
      skipSummary: generateSummary !== 'true',
      category: chosen[0] || null,
    })
    // The AI's pick only stands in when the user chose nothing; either way the
    // item ends up with at least one category.
    await setCategories(item.id, chosen.length ? chosen : [enrichment.category].filter(Boolean))
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
  const { url, notes, linkType, generateSummary, skipFetch, manualContent, categories } = req.body

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'url is required' })
  }

  try {
    let fetchedText = null
    let imageUrl = null
    let author = null

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
      author = result.author
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
      // Parsed out of the page's own metadata; null when there's no
      // identifiable author, which is most of the web.
      author,
    })
    const chosen = parseCategories(categories)
    const enrichment = await enrichItem(item, {
      skipSummary: generateSummary !== 'true',
      category: chosen[0] || null,
    })
    // The AI's pick only stands in when the user chose nothing; either way the
    // item ends up with at least one category.
    await setCategories(item.id, chosen.length ? chosen : [enrichment.category].filter(Boolean))
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Images pasted into a note are uploaded on the spot so the stored HTML can
// reference a real URL. Without this the browser would embed the whole image
// as a base64 data URL, bloating the row and defeating the sanitizer's
// http(s)-only rule.
router.post('/note/image', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' })

  try {
    const extension = (req.file.originalname?.split('.').pop() || 'png').toLowerCase()
    const url = await uploadFile(req.file.buffer, extension, req.file.mimetype)
    res.status(201).json({ url })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Freeform "own content" note — a notepad body mixing text, pasted images and
// links. The HTML is stored for display and flattened to plain text for
// embedding and categorisation.
router.post('/note', async (req, res) => {
  const { html, generateSummary, categories } = req.body

  const safeHtml = sanitizeNoteHtml(html)
  const text = noteHtmlToText(safeHtml)

  if (!text && !firstImageUrl(safeHtml)) {
    return res.status(400).json({ error: 'Write something, or paste an image, before saving' })
  }

  try {
    // Prefer an image the user actually pasted. Failing that, borrow artwork
    // from the first link in the note so the card isn't a bare icon.
    const pastedImage = firstImageUrl(safeHtml)
    const linkedPage = pastedImage ? null : firstLinkUrl(safeHtml)
    const thumbnail = pastedImage || (linkedPage ? await fetchPageImage(linkedPage) : null)

    const item = await insertItem({
      sourceType: 'note',
      rawContent: safeHtml,
      // Falls back to a placeholder for image-only notes so the row still
      // categorises and embeds instead of failing on empty input.
      extractedText: text || 'Saved image note',
      fileUrl: thumbnail,
    })
    const chosen = parseCategories(categories)
    const enrichment = await enrichItem(item, {
      skipSummary: generateSummary !== 'true',
      category: chosen[0] || null,
    })
    // The AI's pick only stands in when the user chose nothing; either way the
    // item ends up with at least one category.
    await setCategories(item.id, chosen.length ? chosen : [enrichment.category].filter(Boolean))
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
  const { text, notes, generateSummary, categories } = req.body

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
    const chosen = parseCategories(categories)
    const enrichment = await enrichItem(item, {
      skipSummary: generateSummary !== 'true',
      category: chosen[0] || null,
    })
    // The AI's pick only stands in when the user chose nothing; either way the
    // item ends up with at least one category.
    await setCategories(item.id, chosen.length ? chosen : [enrichment.category].filter(Boolean))
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PDF upload — text extraction happens server-side. The optional `thumbnail`
// is page 1 rendered to PNG in the browser (see lib/pdfThumbnail.js), which
// avoids a native canvas dependency on the server. User notes are optional and
// combine with the extracted text; AI summary is opt-in.
router.post('/pdf', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  const { notes, generateSummary, categories } = req.body
  const pdfFile = req.files?.file?.[0]
  const thumbnailFile = req.files?.thumbnail?.[0]

  if (!pdfFile) {
    return res.status(400).json({ error: 'file is required' })
  }

  try {
    const parsed = await pdfParse(pdfFile.buffer)
    const fileUrl = await uploadFile(pdfFile.buffer, 'pdf', 'application/pdf')

    // A failed preview upload must not lose the PDF itself.
    let thumbnailUrl = null
    if (thumbnailFile) {
      try {
        thumbnailUrl = await uploadFile(thumbnailFile.buffer, 'png', 'image/png')
      } catch (err) {
        console.error('PDF thumbnail upload failed:', err.message)
      }
    }

    const item = await insertItem({
      sourceType: 'pdf',
      rawContent: pdfFile.originalname,
      extractedText: parsed.text.slice(0, 20000),
      fileUrl,
      thumbnailUrl,
      notes,
    })
    const chosen = parseCategories(categories)
    const enrichment = await enrichItem(item, {
      skipSummary: generateSummary !== 'true',
      category: chosen[0] || null,
    })
    // The AI's pick only stands in when the user chose nothing; either way the
    // item ends up with at least one category.
    await setCategories(item.id, chosen.length ? chosen : [enrichment.category].filter(Boolean))
    res.status(201).json({ ...item, ...enrichment })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// WhatsApp "Export Chat" .txt upload — parsed client-side into raw text,
// parsed here into one item per message. Notes and the AI-summary choice
// apply to the whole batch, since one upload becomes many items.
router.post('/whatsapp', async (req, res) => {
  const { text, notes, generateSummary, categories } = req.body

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text (exported .txt contents) is required' })
  }

  const parsedMessages = parseWhatsappExport(text)

  if (parsedMessages.length === 0) {
    return res.status(400).json({ error: 'No parseable messages found in export' })
  }

  try {
    const items = await insertItems(parsedMessages.map((m) => ({ ...m, notes })))
    res.status(201).json({ count: items.length, items })

    // Enrichment runs in the background so bulk exports (which can be
    // hundreds of messages) don't block the HTTP response. Dashboard picks
    // up category/summary on next refresh once each item finishes.
    for (const item of items) {
      const chosen = parseCategories(categories)
      enrichItem(item, {
        skipSummary: generateSummary !== 'true',
        category: chosen[0] || null,
      })
        .then((enrichment) =>
          setCategories(item.id, chosen.length ? chosen : [enrichment?.category].filter(Boolean)),
        )
        .catch((err) =>
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
  const tag = normalizeLabel(req.body.tag)

  if (!tag) {
    return res.status(400).json({ error: 'tag is required' })
  }

  const { error } = await addTags(id, [tag])
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ tag })
})

// Edit an item's own fields from the detail view. Re-embeds afterwards so
// edited text stays searchable and dedup stays accurate.
router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const { summary, notes, categories, title, subtitle, formattedContent } = req.body

  const updates = {}
  if (summary !== undefined) updates.summary = summary?.trim() || null
  if (notes !== undefined) updates.notes = notes?.trim() || null

  // Formatted content is the user's presentation of the item. The plain-text
  // version is refreshed alongside it so search, chat and dedup reflect what
  // they can actually see — links survive the conversion as [label](url).
  if (formattedContent !== undefined) {
    const safeHtml = sanitizeNoteHtml(formattedContent)
    const plain = htmlToStructuredText(safeHtml)

    if (!plain && !safeHtml.includes('<img')) {
      return res.status(400).json({ error: "Content can't be empty" })
    }

    updates.formatted_content = safeHtml
    updates.extracted_text = plain
  }

  // Categories live in their own table, so they're applied separately rather
  // than as a column update. Any label is allowed — the user can invent their
  // own — but there must be at least one and at most three.
  if (categories !== undefined) {
    const chosen = parseCategories(categories)
    if (!chosen.length) {
      return res.status(400).json({ error: 'Pick at least one category' })
    }
    await setCategories(id, chosen)
  }

  if (Object.keys(updates).length === 0 && categories !== undefined) {
    const { data: refreshed } = await supabase
      .from('items')
      .select('id, title, summary, category, item_categories(category)')
      .eq('id', id)
      .single()
    return res.json(refreshed)
  }

  // Title and subtitle share one column, packed as "Title::subtitle" (see
  // enrichItem.js). The UI works with them separately; the packing stays here.
  if (title !== undefined || subtitle !== undefined) {
    updates.title = packTitle(title, subtitle)
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nothing to update' })
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .select('*, item_categories(category)')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  // Refresh the embedding in the background — the user shouldn't wait on it.
  // skipSummary keeps their edited summary intact instead of regenerating it.
  enrichItem(data, { skipSummary: true }).catch((err) =>
    console.error(`Re-embed after edit failed for item ${id}:`, err.message),
  )

  res.json(data)
})

// Ask a question about one specific item while reading it. Its own text is
// always supplied as the leading excerpts, with related vault content behind
// it — so this answers about the open item first but can still reach wider.
//
// Deliberately not written to chat_queries/chat_sessions: these are throwaway
// questions asked in context, and recording them would bury real conversations
// in the Ask My Vault history.
const RELATED_CHUNK_COUNT = 4

router.post('/:id/chat', async (req, res) => {
  const { id } = req.params
  const { query, history } = req.body
  const userId = process.env.DEFAULT_USER_ID

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'query is required' })
  }

  try {
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, title, summary, category, extracted_text, notes')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (itemError) return res.status(404).json({ error: 'Item not found' })

    const { data: ownChunks } = await supabase
      .from('embeddings')
      .select('item_id, chunk_text')
      .eq('item_id', id)
      .eq('user_id', userId)

    // An item saved before embeddings ran still has its stored text, so fall
    // back to that rather than answering with nothing to go on.
    const focusChunks = ownChunks?.length
      ? ownChunks
      : [
          {
            item_id: id,
            chunk_text: [item.notes, item.extracted_text, item.summary].filter(Boolean).join('\n\n'),
          },
        ]

    const queryEmbedding = await embedText(query)
    const { data: matches } = await supabase.rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: RELATED_CHUNK_COUNT + (ownChunks?.length || 0),
    })

    // Drop this item's own chunks from the related set — they're already the
    // focus excerpts, and repeating them wastes context and confuses numbering.
    const relatedChunks = (matches || [])
      .filter((m) => m.item_id !== id)
      .slice(0, RELATED_CHUNK_COUNT)

    const chunks = [...focusChunks, ...relatedChunks]

    const rawAnswer = await generateGroundedAnswer(query, chunks, {
      // Without this the prompt states the vault is empty, which contradicts
      // `covered` and makes the model deny the user has saved anything.
      vaultIndex: await loadVaultIndex(userId),
      history: (Array.isArray(history) ? history : [])
        .slice(-6)
        .filter((m) => m?.text && (m.role === 'user' || m.role === 'assistant'))
        .map((m) => ({ role: m.role, text: m.text })),
      // The item's own text is always present, so the "not in your vault"
      // flag must never fire here.
      covered: true,
      focusCount: focusChunks.length,
    })

    const answer = sanitizeCitations(rawAnswer, chunks.length)
    const referenced = referencedIndexes(answer)

    const citedItemIds = [
      ...new Set(chunks.filter((_, i) => referenced.has(i + 1)).map((c) => c.item_id)),
    ]
    const { data: citedItems } = citedItemIds.length
      ? await supabase
          .from('items')
          .select('id, source_type, summary, category, created_at')
          .in('id', citedItemIds)
      : { data: [] }

    const citations = chunks
      .map((c, i) => ({
        index: i + 1,
        item: citedItems?.find((it) => it.id === c.item_id) || null,
        chunk_text: c.chunk_text,
      }))
      .filter((c) => referenced.has(c.index))

    res.json({ answer, citations })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Remove a specific tag from an item (e.g. un-favoriting
// once it's actually been reviewed).
router.delete('/:id/tags', async (req, res) => {
  const { id } = req.params
  // Normalised the same way as on insert, so a tag can always be removed by
  // the exact string the UI is displaying.
  const tag = normalizeLabel(req.body.tag)

  if (!tag) {
    return res.status(400).json({ error: 'tag is required' })
  }

  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('item_id', id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .eq('tag', tag)

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

// Read and archived state, as timestamps rather than flags — "when did I read
// this" stays answerable later without another migration.
//
// Kept off PATCH /:id deliberately: that route re-embeds in the background
// after every write, which is the right thing when the text changed and pure
// waste for a toggle that doesn't touch a single searchable field.
router.patch('/:id/status', async (req, res) => {
  const { read, archived } = req.body
  const updates = {}
  const now = new Date().toISOString()

  if (read !== undefined) updates.read_at = read ? now : null
  if (archived !== undefined) updates.archived_at = archived ? now : null

  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'Pass read and/or archived' })
  }

  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .select('id, read_at, archived_at')
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
