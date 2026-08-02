import { useEffect, useRef, useState } from 'react'
import { SendHorizontal, Sparkles } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import Card from './Card.jsx'
import { MessageBubble, TypingDots } from './ChatMessages.jsx'

const STARTERS = ['Summarise the key points', 'How does this connect to my other saves?']

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

  return (
    <Card>
      <p className="mb-3 flex items-center gap-1.5 text-caption font-medium uppercase tracking-wide text-text-secondary">
        <Sparkles className="h-3.5 w-3.5" /> Ask about this item
      </p>

      <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col gap-1.5">
            {STARTERS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => ask(prompt)}
                className="rounded-xl border border-border-subtle px-2.5 py-1.5 text-left text-caption text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-border-subtle bg-surface">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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
          placeholder="Ask about this..."
          className="min-w-0 flex-1 rounded-xl border border-border-subtle px-3 py-2 text-caption focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center justify-center rounded-xl bg-primary px-3 text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
        >
          <SendHorizontal className="h-3.5 w-3.5" />
        </button>
      </form>
    </Card>
  )
}

export default ItemChatPanel
