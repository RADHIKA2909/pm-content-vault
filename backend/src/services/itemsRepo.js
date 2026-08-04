import supabase from './supabaseClient.js'

// Counted once at save rather than per render: the list endpoint doesn't
// return extracted_text, and shipping the full text of every article to the
// browser so it can count words for a "5 min read" label would be absurd.
export const countWords = (text) => {
  const clean = (text || '').trim()
  return clean ? clean.split(/\s+/).length : null
}

// `fields` carries anything the caller has already decided — the reviewed
// title/summary/key points from the guided Add Content flow, or the structured
// columns a job posting fills in. Passed straight through so a reviewed item is
// written correct in one insert rather than inserted blank and patched after.
export async function insertItem({
  userId,
  sourceType,
  rawContent,
  extractedText,
  fileUrl,
  thumbnailUrl,
  linkType,
  notes,
  ...fields
}) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: userId,
      source_type: sourceType,
      raw_content: rawContent,
      extracted_text: extractedText,
      file_url: fileUrl || null,
      thumbnail_url: thumbnailUrl || null,
      link_type: linkType || null,
      notes: notes?.trim() || null,
      word_count: countWords(extractedText),
      ...fields,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function insertItems(rows, userId) {
  const { data, error } = await supabase
    .from('items')
    .insert(
      rows.map((row) => ({
        user_id: userId,
        source_type: row.sourceType,
        raw_content: row.rawContent,
        extracted_text: row.extractedText,
        notes: row.notes?.trim() || null,
        word_count: countWords(row.extractedText),
      })),
    )
    .select()

  if (error) throw new Error(error.message)
  return data
}
