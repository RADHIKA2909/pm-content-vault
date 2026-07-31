import { Router } from 'express'
import supabase from '../services/supabaseClient.js'

const router = Router()
const REVIEW_TAG = 'review before mock'
const STALE_DAYS = 14

// Rule-based resurfacing per CLAUDE.md: (a) items untouched 14+ days,
// (b) items tagged "review before mock" surface with priority.
router.get('/', async (req, res) => {
  const userId = process.env.DEFAULT_USER_ID
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: taggedRows, error: tagError } = await supabase
    .from('tags')
    .select('items(id, source_type, summary, category, created_at, last_engaged_at)')
    .eq('user_id', userId)
    .eq('tag', REVIEW_TAG)

  if (tagError) return res.status(500).json({ error: tagError.message })

  const { data: staleItems, error: staleError } = await supabase
    .from('items')
    .select('id, source_type, summary, category, created_at, last_engaged_at')
    .eq('user_id', userId)
    .or(`last_engaged_at.lt.${staleCutoff},and(last_engaged_at.is.null,created_at.lt.${staleCutoff})`)
    .order('created_at', { ascending: false })

  if (staleError) return res.status(500).json({ error: staleError.message })

  const priorityItems = (taggedRows || [])
    .map((row) => row.items)
    .filter(Boolean)
    .map((item) => ({ ...item, reason: 'tagged_for_review' }))

  const seen = new Set(priorityItems.map((i) => i.id))
  const staleOnly = (staleItems || [])
    .filter((item) => !seen.has(item.id))
    .map((item) => ({ ...item, reason: 'untouched_14_days' }))

  res.json([...priorityItems, ...staleOnly])
})

export default router
