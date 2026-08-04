import 'dotenv/config'
import pdfParse from 'pdf-parse'
import supabase from '../src/services/supabaseClient.js'
import { countWords } from '../src/services/itemsRepo.js'

// One-off backfill for migration 018. Word counts come straight from the text
// already stored; page counts need the PDF itself, which means re-downloading
// each file and re-running the parse that happened at upload.
//
//   node scripts/backfillCardMetrics.js <user-id>
const OWNER = process.argv[2] || process.env.VAULT_OWNER_ID
if (!OWNER) {
  console.error('Pass the vault owner id:  node scripts/backfillCardMetrics.js <user-id>')
  process.exit(1)
}

const { data: items, error } = await supabase
  .from('items')
  .select('id, source_type, title, extracted_text, file_url, page_count, word_count')
  .eq('user_id', OWNER)

if (error) {
  console.error('Could not read items:', error.message)
  process.exit(1)
}

let words = 0
let pages = 0
let skipped = 0

for (const item of items) {
  const updates = {}
  const label = (item.title || item.id).split('::')[0].slice(0, 28)

  if (item.word_count === null) {
    const count = countWords(item.extracted_text)
    if (count) {
      updates.word_count = count
      words += 1
    }
  }

  // Only PDFs, and only ones whose original file is still in storage — the
  // earliest uploads predate file storage and have nothing to re-read.
  if (item.source_type === 'pdf' && item.page_count === null && item.file_url) {
    try {
      const res = await fetch(item.file_url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const parsed = await pdfParse(Buffer.from(await res.arrayBuffer()))
      updates.page_count = parsed.numpages
      pages += 1
    } catch (err) {
      // A missing or unreadable file shouldn't abort the whole backfill; the
      // card simply omits the page count, which is what it does for any item
      // with no value.
      console.warn(`  ! ${label}: could not read the PDF — ${err.message}`)
      skipped += 1
    }
  }

  if (Object.keys(updates).length) {
    const { error: writeError } = await supabase.from('items').update(updates).eq('id', item.id)
    if (writeError) console.warn(`  ! ${label}: ${writeError.message}`)
    else console.log(`  ${label.padEnd(30)} ${JSON.stringify(updates)}`)
  }
}

console.log(`\nword counts filled: ${words}   page counts filled: ${pages}   pdfs skipped: ${skipped}`)
