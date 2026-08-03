import 'dotenv/config'
import supabase from '../src/services/supabaseClient.js'
import { extractFromUrl } from '../src/services/linkExtractor.js'

// One-off maintenance script. The vault owner is passed in rather than read
// from a fixed DEFAULT_USER_ID, which is what the whole app used before it had
// authentication — a single hardcoded owner is exactly what that change removed.
//
//   node scripts/refetchLinks.js <user-id>
const OWNER = process.argv[2] || process.env.VAULT_OWNER_ID
if (!OWNER) {
  console.error('Pass the vault owner id:  node scripts/refetchLinks.js <user-id>')
  process.exit(1)
}


// Re-runs link extraction for saved link items, refreshing their content
// and preview image when the extractor improves. Leaves notes, summary,
// tags and favorites untouched.
const { data: items, error } = await supabase
  .from('items')
  .select('id, raw_content')
  .eq('user_id', OWNER)
  .eq('source_type', 'link')

if (error) {
  console.error('Failed to fetch link items:', error.message)
  process.exit(1)
}

console.log(`Re-fetching ${items.length} link item(s).`)

for (const item of items) {
  const result = await extractFromUrl(item.raw_content)

  if (!result.ok) {
    console.log(`Skipped ${item.id} — ${result.reason}`)
    continue
  }

  await supabase
    .from('items')
    .update({ extracted_text: result.extractedText, file_url: result.imageUrl })
    .eq('id', item.id)

  console.log(`Refreshed ${item.id}`)
}

console.log('Done.')
