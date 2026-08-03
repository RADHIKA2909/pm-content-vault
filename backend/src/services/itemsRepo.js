import supabase from './supabaseClient.js'

// `fields` carries anything the caller has already decided — the reviewed
// title/summary/key points from the guided Add Content flow, or the structured
// columns a job posting fills in. Passed straight through so a reviewed item is
// written correct in one insert rather than inserted blank and patched after.
export async function insertItem({
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
      user_id: process.env.DEFAULT_USER_ID,
      source_type: sourceType,
      raw_content: rawContent,
      extracted_text: extractedText,
      file_url: fileUrl || null,
      thumbnail_url: thumbnailUrl || null,
      link_type: linkType || null,
      notes: notes?.trim() || null,
      ...fields,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function insertItems(rows) {
  const { data, error } = await supabase
    .from('items')
    .insert(
      rows.map((row) => ({
        user_id: process.env.DEFAULT_USER_ID,
        source_type: row.sourceType,
        raw_content: row.rawContent,
        extracted_text: row.extractedText,
        notes: row.notes?.trim() || null,
      })),
    )
    .select()

  if (error) throw new Error(error.message)
  return data
}
