import { useEffect, useRef, useState } from 'react'
import { BrainCircuit, GraduationCap, Link2, SendHorizontal, Sparkles, Target } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import Card from './Card.jsx'
import { MessageBubble, TypingDots } from './ChatMessages.jsx'

/**
 * Openers, as chips rather than boxes.
 *
 * They used to be full-width bordered rectangles, which is the shape of a text
 * input — so they read as three empty fields to fill in rather than three
 * things to tap. A chip is unmistakably a button.
 */
const STARTERS = [
  { label: 'Summarise', Icon: Sparkles, prompt: 'Summarise the key points of this item.' },
  { label: 'Explain', Icon: BrainCircuit, prompt: 'Explain this item to me in plain language.' },
  {
    label: 'Connect to my saves',
    Icon: Link2,
    prompt: 'How does this connect to the other things I have saved?',
  },
  {
    label: 'Quiz me',
    Icon: GraduationCap,
    prompt: 'Ask me three questions about this item to check whether I actually understood it.',
  },
  {
    label: 'Interview insights',
    Icon: Target,
    prompt: 'What in this item would be worth bringing up in a PM interview, and how would I phrase it?',
  },
]

/**
 * Ask questions about the item currently open. Answers lead with this item's
 * own content and can reach into the rest of the vault when it helps.
 *
 * Thread state is local: these are questions asked in passing while reading,
 * and they're deliberately not written to the Ask My Vault history.
 */
function ItemChatPanel({ itemId }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Moving to another item starts a fresh conversation — the previous thread
  // was about a different piece of content.
  useEffect(() => {
    setMessages([])
    setQuery('')
  }, [itemId])

  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  const ask = async (text) => {
    if (!text.trim() || loading) return

    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/items/${itemId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, history }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get an answer')

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: data.answer, citations: data.citations || [] },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Something went wrong: ${err.message}`, error: true },
      ])
    } finally {
      setLoading(false)
    }
  }

  const started = messages.length > 0

  const chip = ({ label, Icon, prompt }) => (
    <button
      key={label}
      onClick={() => ask(prompt)}
      disabled={loading}
      title={prompt}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1.5 text-caption font-medium text-text-primary transition-colors duration-150 hover:bg-primary-light hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      {label}
    </button>
  )

  return (
    <Card className="p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-secondary">
        <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} /> Ask about this item
      </p>

      {!started && <div className="flex flex-wrap gap-1.5">{STARTERS.map(chip)}</div>}

      {started && (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-surface ring-1 ring-border-subtle">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Once a conversation is running the openers become follow-ups, so they
          collapse to a single scrolling row rather than taking three lines of
          the rail away from the answers. */}
      {started && (
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">{STARTERS.map(chip)}</div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask(query)
        }}
        className="mt-3 flex gap-1.5"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about this…"
          className="min-w-0 flex-1 rounded-xl bg-muted/60 px-3 py-2 text-caption text-text-primary transition-all duration-200 placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          aria-label="Ask"
          className="flex shrink-0 items-center justify-center rounded-xl bg-primary px-3 text-white transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
        >
          <SendHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </form>
    </Card>
  )
}

export default ItemChatPanel
