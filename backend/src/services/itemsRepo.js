import supabase from './supabaseClient.js'

export async function insertItem({ sourceType, rawContent, extractedText }) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      user_id: process.env.DEFAULT_USER_ID,
      source_type: sourceType,
      raw_content: rawContent,
      extracted_text: extractedText,
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
      })),
    )
    .select()

  if (error) throw new Error(error.message)
  return data
}
