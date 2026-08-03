import { API_URL } from './api.js'

// The phases the answer endpoint streams, in order. Each one is emitted when
// that step actually finished on the server — retrieval, index load, coverage
// check, generation — so the list reflects real work rather than a timer
// counting down beside a spinner.
export const PHASES = [
  { key: 'searching', label: 'Searching your vault', done: (d) => `${d.matches} passages matched` },
  { key: 'reading', label: 'Reading your saved items', done: (d) => `${d.indexed} items indexed` },
  {
    key: 'connecting',
    label: 'Connecting ideas',
    done: (d) => (d.covered ? 'Found relevant saves' : 'Answering from general knowledge'),
  },
  { key: 'composing', label: 'Composing the answer', done: () => 'Done' },
]

/**
 * Asks a question, calling `onPhase` as each real step completes.
 *
 * EventSource can't be used here: it only issues GET requests, and this posts a
 * body. Reading the response stream by hand gives the same server-sent-events
 * semantics over POST — the same approach lib/composeApi.js takes for ingest.
 */
export async function askVault({ query, history, sessionId }, { onPhase, signal } = {}) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history, sessionId }),
    signal,
  })

  if (!res.ok || !res.body) throw new Error('Could not reach your vault')

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
      if (payload.event === 'phase') onPhase?.(payload)
      if (payload.event === 'result') result = payload
      if (payload.event === 'error') failure = payload
    }
  }

  if (failure) throw new Error(failure.message)
  if (!result) throw new Error('The answer ended before it arrived')
  return result
}

/**
 * Rebuilds a saved turn into the shape the live path produces.
 *
 * Turns saved before answer_sections existed have only flat markdown, so they
 * replay as a body with no overview or cards — which is exactly what they
 * were. Pretending otherwise would invent structure the answer never had.
 */
export function sectionsFromTurn(turn) {
  if (turn.answer_sections) return turn.answer_sections
  return { overview: null, body: turn.answer_text || '', cards: [], takeaway: null, followUps: [] }
}
