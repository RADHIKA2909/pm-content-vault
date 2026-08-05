import { randomUUID } from 'crypto'
import supabase from './supabaseClient.js'

const BUCKET = 'vault-files'

// How long a handed-out file link stays valid. Long enough that a page left
// open over a working session keeps rendering its images, short enough that a
// URL which escapes — a shared screenshot, browser history, a referrer header
// — stops working rather than lasting forever.
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60

/**
 * Stores the exact original file (image/PDF) so it can be viewed later, not
 * just its extracted text.
 *
 * Returns the object's **path**, not a URL. The bucket is private, so there is
 * no URL that works on its own — every link the browser gets is signed at read
 * time by `signStoredFiles`.
 */
export async function uploadFile(buffer, extension, contentType) {
  const path = `${randomUUID()}.${extension}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })

  if (error) throw new Error(`File upload failed: ${error.message}`)
  return path
}

/**
 * The object path for a value stored in file_url / thumbnail_url, or null if
 * the value doesn't live in our bucket.
 *
 * Those columns hold two different kinds of thing: files we uploaded, and
 * external images we merely reference — a fetched page's og:image, or a
 * picture pasted into a note. Returning null for anything foreign is what
 * stops us trying to sign (and mangling) somebody else's URL.
 *
 * Rows written before the bucket went private hold a full public URL; rows
 * written since hold a bare path. Both are understood, which is why flipping
 * the bucket needed no data migration.
 */
export function storagePath(value) {
  if (!value || typeof value !== 'string') return null
  if (!/^https?:\/\//i.test(value)) return value

  const publicMarker = `/storage/v1/object/public/${BUCKET}/`
  const at = value.indexOf(publicMarker)
  if (at !== -1) return value.slice(at + publicMarker.length)

  // An already-signed link carries the same path under a different prefix.
  const signedMarker = `/storage/v1/object/sign/${BUCKET}/`
  const signedAt = value.indexOf(signedMarker)
  if (signedAt !== -1) return value.slice(signedAt + signedMarker.length).split('?')[0]

  return null
}

/**
 * Replace every stored file reference on these rows with a signed URL.
 *
 * Mutates in place and returns the rows, so callers can wrap a query result
 * without restructuring it. External URLs are left exactly as they are.
 *
 * One `createSignedUrls` call covers the whole page of items rather than one
 * request per file — a 20-item library would otherwise mean 40 round trips
 * before the response could be sent.
 */
export async function signStoredFiles(rows, fields = ['file_url', 'thumbnail_url']) {
  const list = Array.isArray(rows) ? rows : [rows]
  const paths = new Set()

  for (const row of list) {
    if (!row) continue
    for (const field of fields) {
      const path = storagePath(row[field])
      if (path) paths.add(path)
    }
  }

  if (!paths.size) return rows

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS)

  if (error) {
    // A signing failure shouldn't take the whole library down with it. The
    // affected cards fall back to their monogram or generated cover, which is
    // what they already do for an item that has no file at all.
    console.error('Could not sign file URLs:', error.message)
    for (const row of list) {
      if (!row) continue
      for (const field of fields) if (storagePath(row[field])) row[field] = null
    }
    return rows
  }

  const signed = new Map()
  for (const entry of data || []) {
    if (entry.signedUrl && !entry.error) signed.set(entry.path, entry.signedUrl)
  }

  for (const row of list) {
    if (!row) continue
    for (const field of fields) {
      const path = storagePath(row[field])
      if (path) row[field] = signed.get(path) ?? null
    }
  }

  return rows
}
