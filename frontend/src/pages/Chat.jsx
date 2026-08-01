import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, SendHorizontal } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { CategoryChip } from '../components/Chip.jsx'

const SUGGESTED_PROMPTS = [
  'What are the key metrics to track for a SaaS product?',
  'Summarize my saved frameworks',
  'What have I saved about RCA?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-border-subtle"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  )
}

function Sources({ citations }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!citations?.length) return null

  return (
    <div className="mt-2 border-t border-border-subtle pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-caption font-medium text-text-secondary hover:text-text-primary"
      >
        Sources ({citations.length}) <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {citations.map((c) => (
            <button
              key={c.index}
              onClick={() => c.item?.id && navigate(`/library/${c.item.id}`)}
              className="flex items-start gap-2 rounded-xl bg-muted px-2.5 py-2 text-left transition-colors hover:bg-primary-light"
            >
              <span className="mt-0.5 shrink-0 rounded bg-surface px-1.5 py-0.5 text-caption font-medium text-text-secondary">
                {c.index}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryChip category={c.item?.category} />
                <span className="text-caption text-text-secondary">
                  {c.item?.summary || c.chunk_text.slice(0, 90)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Chat() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const location = useLocation()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Resume a past question from Dashboard's "Continue your last chat" —
  // rehydrate from what's already stored instead of re-asking Gemini.
  useEffect(() => {
    const resume = location.state?.resume
    if (!resume) return

    const hydrate = async () => {
      let citations = []
      if (resume.cited_item_ids?.length) {
        const res = await fetch(`${API_URL}/api/items`)
        const allItems = res.ok ? await res.json() : []
        citations = resume.cited_item_ids
          .map((id, i) => {
            const item = allItems.find((it) => it.id === id)
            return item ? { index: i + 1, item, chunk_text: item.summary || '' } : null
          })
          .filter(Boolean)
      }

      setMessages([
        { role: 'user', text: resume.query_text },
        { role: 'assistant', text: resume.answer_text, citations },
      ])
    }

    hydrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const ask = async (text) => {
    if (!text.trim()) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get an answer')

      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, citations: data.citations || [] }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Something went wrong: ${err.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col md:h-[calc(100vh-4rem)]">
      <h1 className="text-[24px] font-semibold tracking-tight text-text-primary">Ask My Vault</h1>
      <p className="mb-4 text-body text-text-secondary">
        Ask in your own words — answers are grounded in what you've saved, with sources cited.
      </p>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-sm text-text-secondary">Try asking:</p>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => ask(prompt)}
                  className="rounded-full border border-border-subtle bg-surface px-3.5 py-1.5 text-caption text-text-secondary transition-colors hover:border-primary hover:text-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm ${
                  m.error ? 'bg-warning/10 text-warning' : 'border border-border-subtle bg-surface'
                }`}
              >
                <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                <Sources citations={m.citations} />
              </div>
            </div>
          ),
        )}

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
        className="mt-4 flex gap-2 border-t border-border-subtle pt-4"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Ask something about your saved content..."
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

export default Chat
