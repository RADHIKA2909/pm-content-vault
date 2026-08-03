import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Baby, BookMarked, Copy, Layers, Library, Lightbulb, Sparkles, TextQuote, X } from 'lucide-react'
import { API_URL } from '../../lib/api.js'
import { Sources, TypingDots } from '../ChatMessages.jsx'

/**
 * The four things worth asking about a passage while reading it.
 *
 * All of them go through the existing POST /api/items/:id/chat, which already
 * grounds answers in this item first and the rest of the vault behind it, and
 * returns citations. A second endpoint would be the same retrieval written
 * twice.
 */
const ACTIONS = [
  {
    key: 'explain',
    label: 'Explain',
    Icon: Lightbulb,
    prompt: (quote) => `Explain this passage from the item I'm reading, in plain language:\n\n"${quote}"`,
  },
  {
    key: 'simplify',
    label: 'Simplify',
    Icon: Baby,
    prompt: (quote) =>
      `Rewrite this passage as if I'm completely new to product management. Short sentences, no jargon:\n\n"${quote}"`,
  },
  {
    key: 'summarize',
    label: 'Summarise',
    Icon: TextQuote,
    prompt: (quote) => `Summarise this passage in two or three lines, keeping the specifics:\n\n"${quote}"`,
  },
  {
    key: 'flashcards',
    label: 'Make flashcards',
    Icon: Layers,
    prompt: (quote) =>
      `Turn this passage into 3 flashcards for revision. Format each as "Q: ..." on one line and "A: ..." on the next:\n\n"${quote}"`,
  },
  {
    key: 'interview',
    label: 'Interview question',
    Icon: BookMarked,
    prompt: (quote) =>
      `Write one PM interview question that tests whether someone really understands this passage, then give a short model answer:\n\n"${quote}"`,
  },
  {
    key: 'connect',
    label: 'Connect to my notes',
    Icon: Library,
    prompt: (quote) =>
      `What else in my vault relates to this passage, and what do those saves add to it?\n\n"${quote}"`,
  },
]

/**
 * AI answers about a selected passage, in a drawer beside the content.
 *
 * Beside, never instead of: the passage stays on screen and unchanged. An
 * answer that replaced the text would make the source something the model had
 * rewritten, which is exactly what the annotation layer exists to avoid.
 */
function AiActionDrawer({ open, itemId, selection, onClose, onSaveAsNote }) {
  const [action, setAction] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const reduceMotion = useReducedMotion()

  // A new passage is a new conversation — keeping the previous answer beside a
  // different quote would attach it to text it was never about.
  useEffect(() => {
    setAction(null)
    setAnswer(null)
    setSaved(false)
  }, [selection?.quote])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const run = async (chosen) => {
    setAction(chosen)
    setAnswer(null)
    setSaved(false)
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/items/${itemId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: chosen.prompt(selection.quote) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to get an answer')
      setAnswer({ text: data.answer, citations: data.citations || [] })
    } catch (err) {
      setAnswer({ text: `Something went wrong: ${err.message}`, error: true })
    } finally {
      setLoading(false)
    }
  }

  const save = () => {
    onSaveAsNote({
      startOffset: selection.start,
      endOffset: selection.end,
      quote: selection.quote,
      prefix: selection.prefix,
      suffix: selection.suffix,
      type: 'note',
      note: answer.text,
      aiMeta: { action: action.label, question: action.prompt(selection.quote) },
    })
    setSaved(true)
  }

  return (
    <AnimatePresence>
      {open && selection && (
        <>
          {/* Transparent and click-through from lg up: the whole point is to
              keep reading the passage while the answer sits beside it. Below
              that the drawer covers the column, so a real scrim is honest. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-text-primary/20 backdrop-blur-[1px] lg:pointer-events-none lg:bg-transparent lg:backdrop-blur-none"
          />

          <motion.aside
            role="dialog"
            aria-label="AI actions"
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-surface shadow-card-hover ring-1 ring-border-subtle"
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
                <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Ask about this passage
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
              <blockquote className="mb-4 max-h-40 overflow-y-auto border-l-[3px] border-primary/40 pl-3 text-caption italic leading-relaxed text-text-secondary">
                {selection.quote}
              </blockquote>

              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => run(a)}
                    disabled={loading}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-caption font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${
                      action?.key === a.key
                        ? 'bg-primary-light text-primary ring-1 ring-primary/30'
                        : 'bg-muted/60 text-text-primary hover:bg-muted'
                    }`}
                  >
                    <a.Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    {a.label}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="mt-4 flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm ring-1 ring-border-subtle">
                    <TypingDots />
                  </div>
                </div>
              )}

              {answer && !loading && (
                <div className="mt-4">
                  <div
                    className={`rounded-xl p-3 text-sm ${
                      answer.error ? 'bg-warning/10 text-warning' : 'bg-muted/50 text-text-primary'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
                      <ReactMarkdown>{answer.text}</ReactMarkdown>
                    </div>
                    <Sources citations={answer.citations} />
                  </div>

                  {!answer.error && (
                    <div className="mt-3 flex items-center gap-2">
                      {/* Saving attaches the answer to the exact words it was
                          about, as a note annotation — so it comes back next
                          time you read this passage rather than living only in
                          a chat you'll never scroll back to. */}
                      <button
                        onClick={save}
                        disabled={saved}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-caption font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                      >
                        <BookMarked className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {saved ? 'Saved to highlights' : 'Save to highlights'}
                      </button>
                      <button
                        onClick={() => navigator.clipboard?.writeText(answer.text)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-caption font-medium text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} /> Copy
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!action && !loading && (
                <p className="mt-4 text-caption leading-relaxed text-text-secondary">
                  Answers are grounded in this item first, then the rest of your vault — with sources you
                  can open.
                </p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default AiActionDrawer
