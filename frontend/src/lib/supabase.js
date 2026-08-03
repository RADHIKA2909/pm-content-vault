import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fails loudly at startup rather than at the first sign-in attempt, where the
// error would surface as a login button that silently does nothing.
if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env and fill them in.',
  )
}

/**
 * The browser's Supabase client — auth only.
 *
 * This holds the **anon** key, which is publishable and safe here: it can do
 * nothing the row-level policies don't allow. The service-role key bypasses
 * RLS entirely and must never reach the browser; it stays in the backend's
 * environment.
 *
 * Data still goes through our own API rather than direct table reads, so the
 * server keeps ownership of enrichment, embedding and dedup.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The OAuth redirect comes back with the session in the URL fragment.
    detectSessionInUrl: true,
  },
})
