import supabase from './supabaseClient.js'

// Titles are stored packed as "Title::subtitle" — the index only needs the
// headline half.
function unpackTitle(title) {
  return (title || '').split('::')[0].trim()
}

// Keeps the prompt bounded as the vault grows.
const MAX_INDEXED_ITEMS = 200

/**
 * A compact inventory of everything saved, so the assistant knows what the
 * vault actually contains. Similarity search retrieves passages and can never
 * enumerate a collection — without this the model assumes the vault holds only
 * whatever was retrieved, and will happily tell the user their vault is empty.
 */
export async function loadVaultIndex(userId) {
  const { data } = await supabase
    .from('items')
    .select('title, category, subcategory, summary')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(MAX_INDEXED_ITEMS)

  return (data || []).map((it) => ({ ...it, title: unpackTitle(it.title) }))
}
