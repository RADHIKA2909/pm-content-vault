import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { API_URL } from '../lib/api.js'
import { categoryColor } from '../lib/categoryColors.js'

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  )
}

function Citations({ citations }) {
  if (!citations?.length) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {citations.map((c) => (
        <div key={c.index} className="flex items-start gap-2 text-xs text-slate-500">
          <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
            {c.index}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {c.item?.category && (
              <span className={`rounded px-1.5 py-0.5 font-medium ${categoryColor(c.item.category)}`}>
                {c.item.category}
              </span>
            )}
            <span>{c.item?.summary || c.chunk_text.slice(0, 90)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Chat() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    const userMessage = { role: 'user', text: query }
    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMessage.text }),
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h2 className="text-lg font-semibold mb-1">Ask your vault</h2>
      <p className="text-sm text-slate-500 mb-4">
        Ask in your own words — answers are grounded in what you've saved, with sources cited.
      </p>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
            e.g. "that post about handling stakeholder conflict"
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 text-white px-4 py-2.5 text-sm">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div
                className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm ${
                  m.error ? 'bg-rose-50 text-rose-700' : 'bg-white border border-slate-200'
                }`}
              >
                <div className="prose prose-sm prose-slate max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                  <ReactMarkdown>{m.text}</ReactMarkdown>
                </div>
                <Citations citations={m.citations} />
              </div>
            </div>
          ),
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white border border-slate-200">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-full border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Ask something about your saved content..."
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="rounded-full bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-indigo-700 transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  )
}

export default Chat
