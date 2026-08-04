import { Router } from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import pdfParse from 'pdf-parse'
import { insertItem } from '../services/itemsRepo.js'
import { categorizeAndSummarize, embedText } from '../services/gemini.js'
import { persistEmbedding, findDuplicate } from '../services/enrichItem.js'
import { extractFromUrl, fetchPageImage } from '../services/linkExtractor.js'
import { sanitizeNoteHtml, noteHtmlToText, firstImageUrl, firstLinkUrl } from '../services/noteContent.js'
import { uploadFile } from '../services/fileStorage.js'
import supabase from '../services/supabaseClient.js'

/**
 * The guided Add Content flow: analyse first, write only once the user has
 * confirmed.
 *
 * The rest of the API saves a row and *then* enriches it, which means an
 * abandoned add leaves a row behind and the duplicate check runs too late to
 * act on. These two routes invert that — `/analyze` does all the AI work
 * against nothing but a buffer, and `/commit` is the only thing that writes.
 */
const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Extracted text and embedding, held between analyze and commit so confirming
// doesn't pay for a second round of Gemini calls. In-memory is sufficient: a
// draft is worthless once the tab is gone, and a miss just recomputes.
const drafts = new Map()
const DRAFT_TTL_MS = 15 * 60 * 1000

function putDraft(payload) {
  const token = crypto.randomUUID()
  drafts.set(token, { ...payload, createdAt: Date.now() })

  // Opportunistic sweep — no timer to leak, and the map only grows while
  // someone is actively adding content.
  for (const [key, value] of drafts) {
    if (Date.now() - value.createdAt > DRAFT_TTL_MS) drafts.delete(key)
  }
  return token
}

const takeDraft = (token) => {
  const draft = drafts.get(token)
  if (!draft) return null
  if (Date.now() - draft.createdAt > DRAFT_TTL_MS) {
    drafts.delete(token)
    return null
  }
  return draft
}

// The taxonomy category each dedicated input implies. Only a starting
// suggestion — the model can still disagree, and the user always can.
const IMPLIED_CATEGORY = {
  question: 'Interview Questions',
  job: 'Job Postings',
}

// A job posting's fields, rendered into the prose that gets summarised,
// embedded and searched. The typed columns stay the source of truth; this is
// what the AI and the vector index actually read.
function jobToText({ company, role, applyUrl, salary, deadline, notes }) {
  return [
    role && `Role: ${role}`,
    company && `Company: ${company}`,
    salary && `Salary: ${salary}`,
    deadline && `Application deadline: ${deadline}`,
    applyUrl && `Apply at: ${applyUrl}`,
    notes && `\n${notes}`,
  ]
    .filter(Boolean)
    .join('\n')
    .trim()
}

/**
 * Turns a request into the text we reason over, without persisting anything.
 * Returns { text, meta } where meta carries anything commit needs to rebuild
 * the row (link type, fetched preview image, parsed page count).
 */
async function extractContent(kind, body, files) {
  switch (kind) {
    case 'text':
    case 'question': {
      const text = [body.text, body.notes].filter((v) => v?.trim()).join('\n\n').trim()
      if (!text) throw new Error('Add some content first')
      return { text, meta: {} }
    }

    case 'note': {
      const safeHtml = sanitizeNoteHtml(body.html)
      const text = noteHtmlToText(safeHtml)
      if (!text && !firstImageUrl(safeHtml)) throw new Error('Write something, or paste an image, first')

      const pastedImage = firstImageUrl(safeHtml)
      const linkedPage = pastedImage ? null : firstLinkUrl(safeHtml)
      const thumbnail = pastedImage || (linkedPage ? await fetchPageImage(linkedPage) : null)
      return { text: text || 'Saved image note', meta: { safeHtml, thumbnail } }
    }

    case 'link': {
      const url = body.url?.trim()
      if (!url) throw new Error('Paste a link first')

      if (body.manualContent?.trim()) {
        return { text: body.manualContent.trim(), meta: { url, linkType: body.linkType || 'other' } }
      }

      const result = await extractFromUrl(url)
      if (!result.ok) {
        const err = new Error(`Couldn't read that page — ${result.reason}`)
        err.fetchFailed = true
        throw err
      }
      return {
        text: [body.notes, result.extractedText].filter((v) => v?.trim()).join('\n\n').trim() || url,
        meta: { url, linkType: body.linkType || 'other', imageUrl: result.imageUrl, author: result.author },
      }
    }

    case 'image': {
      // OCR runs in the browser (Tesseract.js) and arrives as `text`; the file
      // itself is only uploaded at commit.
      const text = [body.notes, body.text].filter((v) => v?.trim()).join('\n\n').trim()
      if (!text) throw new Error('Add a note, or make sure the image has readable text')
      return { text, meta: {} }
    }

    case 'pdf': {
      const file = files?.file?.[0]
      if (!file) throw new Error('Choose a PDF first')
      const parsed = await pdfParse(file.buffer)
      const text = [body.notes, parsed.text.slice(0, 20000)].filter((v) => v?.trim()).join('\n\n').trim()
      if (!text) throw new Error("Couldn't read any text out of that PDF")
      return { text, meta: { pageCount: parsed.numpages } }
    }

    case 'job': {
      const text = jobToText(body)
      if (!text) throw new Error('Add at least a role or a company')
      return { text, meta: {} }
    }

    default:
      throw new Error(`Unsupported input type: ${kind}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /analyze — Server-Sent Events
//
// Streamed rather than returned in one lump so the review step's checklist
// can advance on real completions. A single response would leave the client
// with nothing to show but a timer, and a progress indicator driven by a
// timer is one that lies whenever the model is slow.
// ─────────────────────────────────────────────────────────────────────────
router.post('/analyze', upload.fields([{ name: 'file', maxCount: 1 }]), async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    // Without this a proxy can hold the whole stream until it closes.
    'X-Accel-Buffering': 'no',
  })

  const send = (event, data) => res.write(`data: ${JSON.stringify({ event, ...data })}\n\n`)
  const kind = req.body.kind

  try {
    send('phase', { phase: 'extract', status: 'active' })
    const { text, meta } = await extractContent(kind, req.body, req.files)
    send('phase', { phase: 'extract', status: 'done' })

    // Categorisation is allowed to fail without failing the add. A quota error
    // here should still land the user on the review step with an editable
    // form — the AI is an accelerator, not a gate.
    //
    // Opting out genuinely skips the Gemini call rather than hiding its
    // output: it's the one part of this flow that costs quota and seconds.
    // Embedding still runs regardless, so an unsummarised item is still
    // searchable and still dedup-checked.
    let suggestions = { category: IMPLIED_CATEGORY[kind] || null, keyPoints: [] }
    let aiWarning = null

    if (req.body.generateSummary === 'false') {
      send('phase', { phase: 'understand', status: 'skipped' })
    } else {
      send('phase', { phase: 'understand', status: 'active' })
      try {
        const result = await categorizeAndSummarize(text)
        const implied = IMPLIED_CATEGORY[kind]
        suggestions = {
          ...result,
          category: implied || result.category,
          // The model's reason explains the category *it* chose. When the
          // input type overrides that choice, the reason no longer describes
          // what's on screen, so it's dropped rather than shown misleadingly.
          categoryReason: implied ? null : result.categoryReason,
        }
        send('phase', { phase: 'understand', status: 'done' })
      } catch (err) {
        // Logged as well as shown: the previous version reported this to the
        // user and kept no record, so "it keeps failing" was unanswerable
        // without reproducing it by hand.
        console.error(`Categorization failed (${kind}):`, err.name, err.message)
        if (err.name === 'QuotaExceededError') {
          aiWarning =
            "Today's AI limit has been reached, so there are no suggestions to review — you can still fill these in and save."
        } else if (err.name === 'ServiceBusyError') {
          // Not the content's fault. Saying "couldn't read this one" sends the
          // user off editing perfectly good input when the fix is to retry.
          aiWarning =
            'The AI service is busy right now, so there are no suggestions yet — try again in a moment, or fill these in and save.'
        } else {
          aiWarning = "The AI couldn't read this one — you can still fill these in and save."
        }
        send('phase', { phase: 'understand', status: 'failed' })
      }
    }

    send('phase', { phase: 'embed', status: 'active' })
    let embedding = null
    try {
      embedding = await embedText(text)
      send('phase', { phase: 'embed', status: 'done' })
    } catch {
      send('phase', { phase: 'embed', status: 'failed' })
    }

    // Nothing is saved yet, so there is no self to exclude from the match.
    send('phase', { phase: 'duplicates', status: 'active' })
    let duplicate = null
    if (embedding) {
      const match = await findDuplicate(embedding, req.userId)
      if (match) {
        const { data } = await supabase
          .from('items')
          .select('id, title, summary, source_type, created_at')
          .eq('id', match.item_id)
          .single()
        if (data) duplicate = { ...data, similarity: match.similarity }
      }
    }
    send('phase', { phase: 'duplicates', status: 'done' })

    const draftToken = putDraft({ kind, text, embedding, meta })
    send('result', { draftToken, suggestions, duplicate, meta, aiWarning })
  } catch (err) {
    send('error', { message: err.message, fetchFailed: Boolean(err.fetchFailed) })
  } finally {
    res.end()
  }
})

// ─────────────────────────────────────────────────────────────────────────
// POST /commit — the only write in this flow
// ─────────────────────────────────────────────────────────────────────────
router.post('/commit', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), async (req, res) => {
  const { draftToken, kind, title, subtitle, summary, notes } = req.body

  try {
    const draft = takeDraft(draftToken)

    // An expired draft is recoverable: re-extract rather than making the user
    // start over after they've already reviewed everything.
    const text = draft?.text || (await extractContent(kind, req.body, req.files)).text
    const meta = draft?.meta || {}

    const keyPoints = JSON.parse(req.body.keyPoints || '[]').filter(Boolean)
    const categories = JSON.parse(req.body.categories || '[]').filter(Boolean)

    // Files are only uploaded now. Uploading during analyze would leave an
    // orphan in storage every time someone backed out of the review step.
    let fileUrl = meta.thumbnail || meta.imageUrl || null
    let thumbnailUrl = null
    const mainFile = req.files?.file?.[0]
    if (mainFile && (kind === 'image' || kind === 'pdf')) {
      const extension = kind === 'pdf' ? 'pdf' : mainFile.originalname.split('.').pop() || 'png'
      fileUrl = await uploadFile(mainFile.buffer, extension, mainFile.mimetype)
    }
    const thumbFile = req.files?.thumbnail?.[0]
    if (thumbFile) {
      // A failed preview upload must not lose the document itself.
      try {
        thumbnailUrl = await uploadFile(thumbFile.buffer, 'png', 'image/png')
      } catch (err) {
        console.error('Thumbnail upload failed:', err.message)
      }
    }

    const packedTitle = title?.trim()
      ? subtitle?.trim()
        ? `${title.trim()}::${subtitle.trim()}`
        : title.trim()
      : null

    const item = await insertItem({
      userId: req.userId,
      sourceType: kind,
      rawContent: kind === 'note' ? meta.safeHtml : meta.url || req.body.text || req.body.rawContent || text,
      extractedText: text,
      linkType: meta.linkType || null,
      fileUrl,
      thumbnailUrl,
      notes,
      title: packedTitle,
      summary: summary?.trim() || null,
      // Parsed out of the page's own metadata (linkExtractor.js); null for
      // everything that isn't a link with an identifiable author.
      author: meta.author || null,
      category: categories[0] || null,
      key_points: keyPoints.length ? keyPoints : null,
      // Only populated for job postings; null everywhere else.
      company: req.body.company?.trim() || null,
      role: req.body.role?.trim() || null,
      apply_url: req.body.applyUrl?.trim() || null,
      salary: req.body.salary?.trim() || null,
      deadline: req.body.deadline?.trim() || null,
      // pdf-parse counted these pages during /analyze and the value was
      // discarded until now. Null for every other kind.
      page_count: meta.pageCount || null,
    })

    if (categories.length) {
      await supabase.from('item_categories').insert(
        categories.slice(0, 3).map((category) => ({
          item_id: item.id,
          user_id: req.userId,
          category,
        })),
      )
    }

    // Reuse the embedding computed during analyze; only recompute if the draft
    // expired between reviewing and saving.
    const embedding = draft?.embedding || (await embedText(text).catch(() => null))
    if (embedding) await persistEmbedding(item, text, embedding)

    if (draftToken) drafts.delete(draftToken)
    res.status(201).json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Link preview for the choose-input step — the same fetch the save path uses,
// exposed without writing anything.
router.post('/link/preview', async (req, res) => {
  const url = req.body.url?.trim()
  if (!url) return res.status(400).json({ error: 'url is required' })

  try {
    const result = await extractFromUrl(url)
    if (!result.ok) return res.status(422).json({ fetchFailed: true, reason: result.reason })

    res.json({
      title: result.title || null,
      description: (result.extractedText || '').slice(0, 220) || null,
      imageUrl: result.imageUrl || null,
      domain: new URL(url).hostname.replace(/^www\./, ''),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
