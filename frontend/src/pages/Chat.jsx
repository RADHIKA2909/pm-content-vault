import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BrainCircuit,
  GraduationCap,
  Mic,
  PanelLeft,
  PanelRight,
  SendHorizontal,
  Sparkles,
  Target,
  Waypoints,
  X,
} from 'lucide-react'
import { apiFetch } from '../lib/apiFetch.js'
import { askVault, sectionsFromTurn, PHASES } from '../lib/chatApi.js'
import { readPreference } from '../lib/preferences.js'
import { useSpeechInput } from '../lib/useSpeechInput.js'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Modal from '../components/Modal.jsx'
import ConversationRail from '../components/chat/ConversationRail.jsx'
import AnswerCard from '../components/chat/AnswerCard.jsx'
import ContextPanel from '../components/chat/ContextPanel.jsx'
import StreamingStatus from '../components/chat/StreamingStatus.jsx'
import ChatEmptyState from '../components/chat/ChatEmptyState.jsx'
import SourceCard from '../components/chat/SourceCard.jsx'

// Five shortcuts to the shapes of question this assistant is actually good at.
const QUICK_ACTIONS = [
  { label: 'Summarize a topic', Icon: Sparkles, prompt: 'Summarise what I have saved about ' },
  { label: 'Explain a concept', Icon: BrainCircuit, prompt: 'Explain ' },
  { label: 'Connect ideas', Icon: Waypoints, prompt: 'How do my saved notes connect to each other?' },
  { label: 'Quiz me', Icon: GraduationCap, prompt: 'Quiz me on something I have saved.' },
  {
    label: 'Generate interview Qs',
    Icon: Target,
    prompt: 'Generate PM interview questions from what I have saved.',
  },
]

// Stored turns only keep the cited item ids, so the sources are rebuilt from
// the current library. An item deleted since is simply dropped.
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
  const [phases, setPhases] = useState({})

  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [stats, setStats] = useState(null)

  const [railOpen, setRailOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const location = useLocation()

  // Speech lands in the input rather than sending straight off — PM jargon
  // ("RCA", "KPI trees") gets misheard often enough that a glance before
  // sending is worth the extra tap.
  const mic = useSpeechInput({ onTranscript: setQuery })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, phases])

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/chat/sessions`)
      setSessions(res.ok ? await res.json() : [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
    apiFetch(`/api/items/stats`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setStats)
      .catch(() => setStats(null))
  }, [loadSessions])

  const openSession = useCallback(async (id) => {
    setRailOpen(false)
    setSessionId(id)
    setLoading(true)

    try {
      const [turnsRes, itemsRes] = await Promise.all([
        apiFetch(`/api/chat/sessions/${id}`),
        apiFetch(`/api/items`),
      ])

      const turns = turnsRes.ok ? await turnsRes.json() : []
      const allItems = itemsRes.ok ? await itemsRes.json() : []

      setMessages(
        turns.flatMap((t) => [
          { role: 'user', text: t.query_text },
          {
            role: 'assistant',
            sections: sectionsFromTurn(t),
            citations: hydrateCitations(t.cited_item_ids, allItems),
          },
        ]),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  // Opened from the Dashboard's "Continue your last chat" — replays the whole
  // thread, not just the one question that was clicked.
  useEffect(() => {
    if (location.state?.sessionId) openSession(location.state.sessionId)
  }, [location.state, openSession])

  // Arrived from a prompt elsewhere in the app (the Favorites study panel).
  // Asked on arrival rather than dropped into the input: the user already
  // chose the question by clicking it, so making them press send again is a
  // step that decides nothing.
  const askedPromptRef = useRef(null)

  useEffect(() => {
    const prompt = location.state?.prompt
    if (!prompt || askedPromptRef.current === prompt) return
    askedPromptRef.current = prompt
    ask(prompt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const newChat = () => {
    setSessionId(null)
    setMessages([])
    setQuery('')
    setRailOpen(false)
    mic.reset()
    inputRef.current?.focus()
  }

  const deleteSession = async (id) => {
    await apiFetch(`/api/chat/sessions/${id}`, { method: 'DELETE' })
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (id === sessionId) newChat()
  }

  const ask = async (text) => {
    if (!text.trim() || loading) return

    // Captured before the append, so it's the conversation *leading up to* this
    // question — that's what makes follow-ups like "then what?" resolvable.
    const history = messages
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.role === 'user' ? m.text : m.sections?.body || '' }))

    // The question has been handed off, so the mic goes quiet and forgets it —
    // otherwise it keeps dictating onto the end of a message already sent.
    mic.reset()

    setMessages((prev) => [...prev, { role: 'user', text }])
    setQuery('')
    setPhases({})
    setLoading(true)

    try {
      const result = await askVault(
        // Read per question rather than held in state: changing it in
        // Settings then coming back here should apply immediately.
        { query: text, history, sessionId, style: readPreference('answerStyle') },
        {
          onPhase: (payload) => {
            if (payload.status !== 'done') return
            const phase = PHASES.find((p) => p.key === payload.phase)
            setPhases((prev) => ({
              ...prev,
              [payload.phase]: { done: true, detail: phase?.done(payload) },
            }))
          },
        },
      )

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          sections: result.sections,
          citations: result.citations || [],
          context: result.context,
          connectedIdeas: result.connectedIdeas || [],
        },
      ])

      // The first question of a chat creates its session server-side; adopt the
      // id so every follow-up lands in the same thread.
      if (result.sessionId) setSessionId(result.sessionId)
      loadSessions()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', error: true, text: `Something went wrong: ${err.message}` },
      ])
    } finally {
      setLoading(false)
      setPhases({})
    }
  }

  const startPrompt = (prompt) => {
    // A prompt ending in a space is a stem the user finishes themselves
    // ("Explain "), so it goes into the box rather than being sent half-formed.
    if (prompt.endsWith(' ')) {
      setQuery(prompt)
      inputRef.current?.focus()
      return
    }
    ask(prompt)
  }

  const lastAnswer = [...messages].reverse().find((m) => m.role === 'assistant' && !m.error)

  const contextPanel = (
    <ContextPanel
      stats={stats}
      context={lastAnswer?.context}
      connectedIdeas={lastAnswer?.connectedIdeas}
      hasAnswer={Boolean(lastAnswer)}
      onAsk={ask}
      onOpenSources={() => setSourcesOpen(true)}
    />
  )

  const rail = (
    <ConversationRail
      sessions={sessions}
      activeId={sessionId}
      onSelect={openSession}
      onNew={newChat}
      onDelete={setPendingDelete}
      loading={sessionsLoading}
    />
  )

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4 md:h-[calc(100vh-4rem)]">
      <aside className="hidden w-60 shrink-0 lg:block">{rail}</aside>

      {railOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-text-primary/20 backdrop-blur-[2px]" onClick={() => setRailOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-slideInRight bg-bg-app p-4 shadow-card-hover">
            {rail}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-3 flex shrink-0 items-start gap-3">
          <button
            onClick={() => setRailOpen(true)}
            aria-label="Conversations"
            className="mt-0.5 rounded-xl bg-surface p-2 text-text-secondary shadow-card ring-1 ring-border-subtle transition-colors duration-150 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-[24px] font-semibold leading-tight tracking-tight text-text-primary">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={2} />
              Ask My Vault
            </h1>
            <p className="mt-0.5 text-body text-text-secondary">
              Your AI research partner, powered by your saved knowledge.
            </p>

            <div className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {QUICK_ACTIONS.map(({ label, Icon, prompt }) => (
                <button
                  key={label}
                  onClick={() => startPrompt(prompt)}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1.5 text-caption font-medium text-text-primary shadow-card ring-1 ring-border-subtle transition-colors duration-150 hover:bg-primary-light hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setContextOpen(true)}
            aria-label="Vault context"
            className="mt-0.5 rounded-xl bg-surface p-2 text-text-secondary shadow-card ring-1 ring-border-subtle transition-colors duration-150 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary xl:hidden"
          >
            <PanelRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
          {messages.length === 0 && !loading && <ChatEmptyState onAsk={ask} stats={stats} />}

          {messages.map((m, i) =>
            m.role === 'user' ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex justify-end"
              >
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-white shadow-card">
                  {m.text}
                </p>
              </motion.div>
            ) : (
              <AnswerCard
                key={i}
                message={m}
                onFollowUp={ask}
                onOpenSources={() => setSourcesOpen(true)}
              />
            ),
          )}

          <AnimatePresence>{loading && <StreamingStatus phases={phases} />}</AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(query)
            }}
            className="flex items-center gap-1.5 rounded-2xl bg-surface p-1.5 shadow-raised ring-1 ring-border-subtle transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary"
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              placeholder={
                mic.listening ? 'Listening — speak now…' : 'Ask something about your saved content…'
              }
            />

            {mic.supported && (
              <button
                type="button"
                onClick={() => mic.toggle(query)}
                aria-label={mic.listening ? 'Stop listening' : 'Ask by voice'}
                aria-pressed={mic.listening}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  mic.listening
                    ? 'animate-pulse bg-accent text-white'
                    : 'text-text-secondary hover:bg-muted hover:text-text-primary'
                }`}
              >
                <Mic className="h-4 w-4" strokeWidth={1.75} />
              </button>
            )}

            <button
              type="submit"
              disabled={loading || !query.trim()}
              aria-label="Send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
            >
              <SendHorizontal className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>

          {mic.error && <p className="mt-1.5 text-caption text-warning">{mic.error}</p>}
          <p className="mt-1.5 text-center text-[11px] text-text-secondary">
            Answers cite your saved items. Anything beyond your vault is flagged in the answer.
          </p>
        </div>
      </div>

      <aside className="hidden w-[300px] shrink-0 overflow-y-auto xl:block">{contextPanel}</aside>

      {/* Below xl the context becomes a slide-over rather than disappearing —
          it's the panel that says the answer came from the user's own vault,
          so losing it entirely on a laptop would cost the page its point. */}
      {contextOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-text-primary/20 backdrop-blur-[2px]" onClick={() => setContextOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[330px] max-w-[88vw] animate-slideInRight flex-col bg-bg-app shadow-card-hover">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <h2 className="text-[15px] font-semibold text-text-primary">Vault context</h2>
              <button
                onClick={() => setContextOpen(false)}
                aria-label="Close context"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-24">{contextPanel}</div>
          </div>
        </div>
      )}

      <Modal open={sourcesOpen} onClose={() => setSourcesOpen(false)} title="Sources for this answer" size="lg">
        <div className="flex flex-col gap-2">
          {lastAnswer?.citations?.length ? (
            lastAnswer.citations.map((c, i) => (
              <SourceCard
                key={c.index}
                index={c.index}
                item={c.item}
                chunkText={c.chunk_text}
                similarity={c.similarity}
                delay={i * 40}
              />
            ))
          ) : (
            <p className="text-caption text-text-secondary">
              This answer didn't draw on any saved items — it came from general knowledge.
            </p>
          )}
        </div>
      </Modal>

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
