import 'dotenv/config'
import supabase from '../src/services/supabaseClient.js'
import { enrichItem } from '../src/services/enrichItem.js'

// One-off backfill: the `title` field was added after some items were
// already categorized, so their `category`/`summary` are set but `title`
// is null. Re-running enrichItem re-does categorization (cheap, same call)
// and picks up the new title field; embeddings are safely replaced, not
// duplicated (see enrichItem.js).
const { data: pendingItems, error } = await supabase
  .from('items')
  .select('id, user_id, extracted_text')
  .eq('user_id', process.env.DEFAULT_USER_ID)
  .is('title', null)

if (error) {
  console.error('Failed to fetch pending items:', error.message)
  process.exit(1)
}

console.log(`Found ${pendingItems.length} item(s) missing a title.`)

for (const item of pendingItems) {
  try {
    await enrichItem(item)
    console.log(`Backfilled title for item ${item.id}`)
  } catch (err) {
    console.error(`Failed to backfill item ${item.id}:`, err.message)
  }
}

console.log('Done.')
