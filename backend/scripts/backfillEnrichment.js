import 'dotenv/config'
import supabase from '../src/services/supabaseClient.js'
import { enrichItem } from '../src/services/enrichItem.js'

// One-off/rerunnable backfill for items whose categorization or embedding
// failed at ingest time (e.g. missing API key, model outage) and were left
// with category = null.
const { data: pendingItems, error } = await supabase
  .from('items')
  .select('id, user_id, extracted_text')
  .eq('user_id', process.env.DEFAULT_USER_ID)
  .is('category', null)

if (error) {
  console.error('Failed to fetch pending items:', error.message)
  process.exit(1)
}

console.log(`Found ${pendingItems.length} item(s) to backfill.`)

for (const item of pendingItems) {
  try {
    await enrichItem(item)
    console.log(`Enriched item ${item.id}`)
  } catch (err) {
    console.error(`Failed to enrich item ${item.id}:`, err.message)
  }
}

console.log('Done.')
