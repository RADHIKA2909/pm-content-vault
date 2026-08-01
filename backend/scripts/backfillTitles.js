import 'dotenv/config'
import supabase from '../src/services/supabaseClient.js'
import { enrichItem } from '../src/services/enrichItem.js'

// One-off backfill: regenerates every item's title in the current short
// (1-2 word) format. Safe to re-run any time the title prompt changes —
// embeddings are replaced, not duplicated (see enrichItem.js).
const { data: items, error } = await supabase
  .from('items')
  .select('id, user_id, extracted_text')
  .eq('user_id', process.env.DEFAULT_USER_ID)

if (error) {
  console.error('Failed to fetch items:', error.message)
  process.exit(1)
}

console.log(`Regenerating titles for ${items.length} item(s).`)

for (const item of items) {
  try {
    await enrichItem(item)
    console.log(`Updated title for item ${item.id}`)
  } catch (err) {
    console.error(`Failed to update item ${item.id}:`, err.message)
  }
}

console.log('Done.')
