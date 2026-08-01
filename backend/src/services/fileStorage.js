import { randomUUID } from 'crypto'
import supabase from './supabaseClient.js'

const BUCKET = 'vault-files'

// Stores the exact original file (image/PDF) so it can be viewed later,
// not just its extracted text/summary. Bucket is public — see migration
// 002_add_file_url.sql comment for the tradeoff this accepts.
export async function uploadFile(buffer, extension, contentType) {
  const path = `${randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })

  if (error) throw new Error(`File upload failed: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
