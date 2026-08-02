import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mic, PanelLeft, SendHorizontal } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useSpeechInput } from '../lib/useSpeechInput.js'
import { MessageBubble, TypingDots } from '../components/ChatMessages.jsx'
import ChatHistoryPanel from '../components/ChatHistoryPanel.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'

const SUGGESTED_PROMPTS = [
  'What topics are saved in my vault?',
  'What have I saved about RCA?',
  'Ask me a product sense question',
  'What metrics matter for a SaaS product?',
]

// Stored turns only keep the cited item ids, so the Sources list is rebuilt
// from the current library. An item deleted since is simply dropped.
function hydrateCitations(citedItemIds, allItems) {
  return (citedItemIds || [])
    .map((id, i) => {
      const item = allItems.find((it) => it.id === id)
      return item ? { index: i + 1, item, chunk_text: item.summary || '' } : null
    })
    .filter(Boolean)
}

function Chat() {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const bottomRef = useRef(null)
  const location = useLocation()

  // Speech lands in the input rather than sending straight off — PM jargon
  // ("RCA", "KPI trees") gets misheard often enough that a glance before
  // sending is worth the extra tap.
  const mic = useSpeechInput({ onTranscript: setQuery })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`)
      setSessions(res.ok ? await res.json() : [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const openSession = async (id) => {
    setHistoryOpen(false)
    setSessionId(id)
    setLoading(true)

    try {
      const [turnsRes, itemsRes] = await Promise.all([
        fetch(`${API_URL}/api/chat/sessions/${id}`),
        fetch(`${API_URL}/api/items`),
      ])

      const turns = turnsRes.ok ? await turnsRes.json() : []
      const allItems = itemsRes.ok ? await itemsRes.json() : []

      setMessages(
        turns.flatMap((t) => [
          { role: 'user', text: t.query_text },
          {
            role: 'assistant',
            text: t.answer_text,
            citations: hydrateCitations(t.cited_item_ids, allItems),
          },
        ]),
      )
    } finally {
      setLoading(false)
    }
  }

  // Opened from Dashboard's "Continue your last chat" — replays the whole
  // thread, not just the one question that was clicked.
  useEffect(() => {
    if (location.state?.sessionId) openSession(location.state.sessionId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const newChat = () => {
    setSessionId(null)
    setMessages([])
    setQuery('')
    setHistoryOpen(false)
    mic.reset()
  }

  const deleteSession = async (id) => {
    await fetch(`${API_URL}/api/chat/sessions/${id}`, { method: 'DELETE' })
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === sessionId) {
      setSessionId(null)
      setMessages([])
    }
  }

  const ask = async (text) => {
    if (!text.trim()) return

    // Captured before the append, so it's the conversation *leading up to* this
    // question — that's what makes follow-ups like "then what?" resolvable.
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }))

    // The question has been handed off, so the mic goes quiet and forgets it —
    // otherwise it keeps dictating onto the end of a message already sent.
    mic.reset()

    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuery('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, history, sessionId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get an answer')

      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer, citations: data.citations || [] }])

      // The first question of a chat creates its session server-side; adopt the
      // id so every follow-up lands in the same thread.
      if (data.sessionId) setSessionId(data.sessionId)
      loadSessions()
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Something went wrong: ${err.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  const historyPanel = (
    <ChatHistoryPanel
      sessions={sessions}
      activeId={sessionId}
      onSelect={openSession}
      onNew={newChat}
      onDelete={setPendingDelete}
      loading={sessionsLoading}
    />
  )

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 md:h-[calc(100vh-4rem)]">
      {/* Permanent rail on desktop; a slide-over on smaller screens, where the
          chat itself needs the full width. */}
      <aside className="hidden w-60 shrink-0 border-r border-border-subtle pr-4 lg:block">
        {historyPanel}
      </aside>

      {historyOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-text-primary/20"
            onClick={() => setHistoryOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface p-4 shadow-xl">
            {historyPanel}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3">
          <button
            onClick={() => setHistoryOpen(true)}
            aria-label="Chat history"
            className="mt-1 rounded-xl border border-border-subtle p-2 text-text-secondary transition-colors hover:border-primary hover:text-primary lg:hidden"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold tracking-tight text-text-primary">Ask My Vault</h1>
            <p className="mb-4 text-body text-text-secondary">
              Ask about what you've saved — answers cite your sources. General PM questions and
              practice rounds work too.
            </p>
          </div>
        </div>

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

      <div className="mt-4 border-t border-border-subtle pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(query)
          }}
          className="flex gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded-xl border border-border-subtle px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder={
              mic.listening ? 'Listening — speak now...' : 'Ask something about your saved content...'
            }
          />

          {mic.supported && (
            <button
              type="button"
              onClick={() => mic.toggle(query)}
              aria-label={mic.listening ? 'Stop listening' : 'Ask by voice'}
              aria-pressed={mic.listening}
              className={`flex items-center justify-center rounded-xl border px-4 py-2.5 transition-colors ${
                mic.listening
                  ? 'animate-pulse border-accent bg-accent text-white'
                  : 'border-border-subtle text-text-secondary hover:border-primary hover:text-primary'
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </form>

        {mic.error && <p className="mt-2 text-caption text-warning">{mic.error}</p>}
      </div>
      </div>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete this conversation?"
        description={`"${pendingDelete?.title || 'Untitled chat'}" and all its messages will be removed. Your saved items aren't affected.`}
        confirmLabel="Delete"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => deleteSession(pendingDelete.id)}
      />
    </div>
  )
}

export default Chat
