import 'dotenv/config'
import supabase from '../src/services/supabaseClient.js'
import { enrichItem } from '../src/services/enrichItem.js'

// One-off maintenance script. The vault owner is passed in rather than read
// from a fixed DEFAULT_USER_ID, which is what the whole app used before it had
// authentication — a single hardcoded owner is exactly what that change removed.
//
//   node scripts/backfillEnrichment.js <user-id>
const OWNER = process.argv[2] || process.env.VAULT_OWNER_ID
if (!OWNER) {
  console.error('Pass the vault owner id:  node scripts/backfillEnrichment.js <user-id>')
  process.exit(1)
}


// One-off/rerunnable backfill for items whose categorization or embedding
// failed at ingest time (e.g. missing API key, model outage) and were left
// with category = null.
const { data: pendingItems, error } = await supabase
  .from('items')
  .select('id, user_id, extracted_text')
  .eq('user_id', OWNER)
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
