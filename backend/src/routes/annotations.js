import { Router } from 'express'
import supabase from '../services/supabaseClient.js'

/**
 * The annotation layer.
 *
 * Nothing here ever writes to `items`. That's the whole point of the table:
 * highlights, notes and formatting are stored *against* the content by
 * character offset, so the imported source stays byte-identical to what was
 * saved. Re-importing a page, or fixing an extraction bug later, can't destroy
 * a year of highlights.
 *
 * Mounted at /api, so the paths below are /api/items/:id/annotations and
 * /api/annotations/:annotationId.
 */
const router = Router()

const TYPES = ['highlight', 'bold', 'italic', 'underline', 'strikethrough', 'note', 'important', 'question']
const COLORS = ['yellow', 'green', 'purple', 'blue']

// Long enough for a paragraph, short enough that an accidental select-all
// doesn't copy an entire document into the row.
const MAX_QUOTE = 4000
const MAX_NOTE = 5000

const clean = (value, max) => (typeof value === 'string' ? value.slice(0, max) : null)

// Newest last: annotations read as a reading trail down the page, and the
// sidebar list is ordered by position anyway.
const SELECT = 'id, item_id, start_offset, end_offset, quote, prefix, suffix, type, color, note, ai_meta, created_at'

router.get('/items/:id/annotations', async (req, res) => {
  const { data, error } = await supabase
    .from('annotations')
    .select(SELECT)
    .eq('item_id', req.params.id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .order('start_offset', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

router.post('/items/:id/annotations', async (req, res) => {
  const { startOffset, endOffset, quote, prefix, suffix, type, color, note, aiMeta } = req.body

  // Validated here rather than left to the CHECK constraints: a Postgres
  // constraint violation comes back as an opaque 500, and the client needs to
  // know which field it got wrong.
  if (!TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` })
  }
  if (color != null && !COLORS.includes(color)) {
    return res.status(400).json({ error: `color must be one of: ${COLORS.join(', ')}` })
  }
  if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset) || endOffset <= startOffset) {
    return res.status(400).json({ error: 'startOffset and endOffset must be integers with end after start' })
  }
  if (typeof quote !== 'string' || !quote.length) {
    return res.status(400).json({ error: 'quote is required' })
  }

  // The item is checked before insert so an annotation can never be orphaned
  // against someone else's row or a deleted one.
  const { data: item } = await supabase
    .from('items')
    .select('id')
    .eq('id', req.params.id)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .maybeSingle()

  if (!item) return res.status(404).json({ error: 'Item not found' })

  const { data, error } = await supabase
    .from('annotations')
    .insert({
      item_id: req.params.id,
      user_id: process.env.DEFAULT_USER_ID,
      start_offset: startOffset,
      end_offset: endOffset,
      quote: quote.slice(0, MAX_QUOTE),
      prefix: clean(prefix, 200),
      suffix: clean(suffix, 200),
      type,
      // Only highlights carry a colour; anything else is stored null so the
      // column stays meaningful.
      color: type === 'highlight' ? color || 'yellow' : null,
      note: clean(note, MAX_NOTE)?.trim() || null,
      ai_meta: aiMeta || null,
    })
    .select(SELECT)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

// Only the parts a user can change after the fact: the note text and a
// highlight's colour. Offsets and quote are set once at creation — an
// annotation that could be re-pointed at different words would no longer mean
// what it said.
router.patch('/annotations/:annotationId', async (req, res) => {
  const { note, color } = req.body
  const updates = {}

  if (note !== undefined) updates.note = clean(note, MAX_NOTE)?.trim() || null
  if (color !== undefined) {
    if (!COLORS.includes(color)) {
      return res.status(400).json({ error: `color must be one of: ${COLORS.join(', ')}` })
    }
    updates.color = color
  }

  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' })

  const { data, error } = await supabase
    .from('annotations')
    .update(updates)
    .eq('id', req.params.annotationId)
    .eq('user_id', process.env.DEFAULT_USER_ID)
    .select(SELECT)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/annotations/:annotationId', async (req, res) => {
  const { error } = await supabase
    .from('annotations')
    .delete()
    .eq('id', req.params.annotationId)
    .eq('user_id', process.env.DEFAULT_USER_ID)

  if (error) return res.status(500).json({ error: error.message })
  res.status(204).end()
})

export default router
