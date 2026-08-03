import { API_URL } from './api.js'

// The phases /analyze streams, in order. Labels are what the processing step
// shows; the keys match the server's event names.
// Four rows, not five. "Detecting category" and "Writing summary" come back
// from a single Gemini call, so listing them separately would mean two rows
// ticking microseconds apart — animation dressed up as progress.
export const PHASES = [
  { key: 'extract', label: 'Reading content', hint: 'Pulling out the text' },
  { key: 'understand', label: 'Detecting category and writing summary', hint: 'The part that takes a moment' },
  { key: 'embed', label: 'Making it searchable', hint: 'Indexing for Ask My Vault' },
  { key: 'duplicates', label: 'Checking for duplicates', hint: 'Comparing against your vault' },
]

/**
 * Runs the pre-save analysis, calling `onPhase` as each real step completes.
 *
 * EventSource can't be used here: it only issues GET requests, and this posts
 * a body (and sometimes a file). Reading the response stream by hand gives the
 * same server-sent-events semantics over POST.
 */
export async function analyze(formData, { onPhase, signal } = {}) {
  const res = await fetch(`${API_URL}/api/items/analyze`, {
    method: 'POST',
    body: formData,
    signal,
  })

  if (!res.ok || !res.body) throw new Error('Analysis failed to start')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null
  let failure = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // Events are separated by a blank line; a partial tail stays buffered.
    const chunks = buffer.split('\n\n')
    buffer = chunks.pop() || ''

    for (const chunk of chunks) {
      const line = chunk.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue

      const payload = JSON.parse(line.slice(6))
      if (payload.event === 'phase') onPhase?.(payload.phase, payload.status)
      if (payload.event === 'result') result = payload
      if (payload.event === 'error') failure = payload
    }
  }

  if (failure) {
    const err = new Error(failure.message)
    err.fetchFailed = failure.fetchFailed
    throw err
  }
  if (!result) throw new Error('Analysis ended without a result')
  return result
}

export async function commit(formData) {
  const res = await fetch(`${API_URL}/api/items/commit`, { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Could not save')
  return data
}

export async function fetchLinkPreview(url) {
  const res = await fetch(`${API_URL}/api/items/link/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.reason || data.error || 'Could not read that page')
  return data
}
