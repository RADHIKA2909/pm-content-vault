import { API_URL } from './api.js'
import { supabase } from './supabase.js'

/**
 * `fetch` for our API, with the session attached.
 *
 * Every request needs a bearer token now, and there are forty call sites. A
 * wrapper is the only way that stays true — the alternative is remembering to
 * add a header in forty places and in every one written afterwards, and the
 * one that gets forgotten fails as a 401 at runtime rather than at build time.
 *
 * Takes a path (`/api/items`), not a full URL, so the base can move without
 * touching callers.
 */
export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token

  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // Only set for bodies we serialise ourselves. FormData must set its own
  // Content-Type, including the multipart boundary — overriding it here breaks
  // every file upload in the ingest flow.
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })

  // An expired or revoked token means the session is over. Signing out here
  // puts the app in a state that matches the server's view of it, and the
  // route guard sends them to the login page — rather than leaving every
  // panel showing a silent failure.
  if (response.status === 401) {
    await supabase.auth.signOut()
  }

  return response
}

/** The common case: fetch, parse, throw the API's own message on failure. */
export async function apiJson(path, options) {
  const response = await apiFetch(path, options)
  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`)
  }
  return data
}
