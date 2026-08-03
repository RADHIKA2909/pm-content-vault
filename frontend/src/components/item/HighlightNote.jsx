import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Sparkles, Trash2, X } from 'lucide-react'
import { HIGHLIGHT_COLORS, HIGHLIGHT_SWATCH } from '../../lib/annotations.js'

const TYPE_LABEL = {
  highlight: 'Highlight',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  note: 'Note',
  important: 'Important',
  question: 'Question',
}

/**
 * The popover anchored to a piece of annotated text.
 *
 * Two jobs, one component, because they're the same panel at different points
 * in its life: `compose` writes a note against a fresh selection, `view` shows
 * what's already there. Splitting them would mean two popovers that have to
 * look and position identically.
 */
function HighlightNote({
  mode = 'view',
  x,
  y,
  flip,
  quote,
  annotations = [],
  onSave,
  onUpdateNote,
  onColor,
  onDelete,
  onClose,
}) {
  const noted = annotations.find((a) => a.note)
  const [draft, setDraft] = useState(noted?.note || '')
  const inputRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (mode === 'compose') inputRef.current?.focus()
  }, [mode])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const highlight = annotations.find((a) => a.type === 'highlight')
  const aiSourced = annotations.find((a) => a.ai_meta)

  const commit = () => {
    const text = draft.trim()
    if (mode === 'compose') {
      if (!text) return onClose()
      return onSave(text)
    }
    if (noted && text !== (noted.note || '')) onUpdateNote(noted, text)
    onClose()
  }

  return (
    // Positioning and animation are split across two elements deliberately:
    // Framer writes its transform inline and would overwrite Tailwind's
    // -translate-x-1/2 / -translate-y-full, dropping the popover onto the line
    // below the text it belongs to.
    <div
      style={{ left: x, top: y }}
      className={`absolute z-30 -translate-x-1/2 ${flip ? '' : '-translate-y-full'}`}
    >
    <motion.div
      role="dialog"
      aria-label={mode === 'compose' ? 'Add a note' : 'Annotation'}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: flip ? -4 : 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onMouseDown={(e) => e.stopPropagation()}
      className="w-[280px] max-w-[calc(100vw-2rem)] rounded-xl bg-surface p-3 shadow-card-hover ring-1 ring-border-subtle"
    >
      {/* The quote is the anchor for everything below it — without it the
          panel is a note floating free of the sentence it belongs to. */}
      <p className="mb-2 line-clamp-3 border-l-2 border-primary/40 pl-2 text-caption italic leading-relaxed text-text-secondary">
        {quote}
      </p>

      {mode === 'view' && highlight && (
        <div className="mb-2 flex items-center gap-1">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColor(highlight, color)}
              aria-label={`Change to ${color}`}
              title={color}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                highlight.color === color ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
            >
              <span className={`h-4 w-4 rounded-full ring-1 ring-black/5 ${HIGHLIGHT_SWATCH[color]}`} />
            </button>
          ))}
        </div>
      )}

      {aiSourced?.ai_meta?.action && (
        <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
          <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
          {aiSourced.ai_meta.action}
        </p>
      )}

      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            commit()
          }
        }}
        rows={3}
        placeholder="What did you want to remember about this?"
        className="w-full resize-y rounded-lg bg-muted/60 px-2.5 py-2 text-caption leading-relaxed text-text-primary placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
      />

      <div className="mt-2 flex items-center gap-1">
        <button
          onClick={commit}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-caption font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} /> Save
        </button>
        <button
          onClick={onClose}
          className="rounded-lg px-2.5 py-1.5 text-caption font-medium text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Cancel
        </button>

        {/* One remove button per annotation on this span, labelled by type —
            a highlight and a note can sit on the same words, and "Remove"
            alone wouldn't say which one is about to go. */}
        {mode === 'view' && (
          <span className="ml-auto flex items-center gap-0.5">
            {annotations.map((annotation) => (
              <button
                key={annotation.id}
                onClick={() => onDelete(annotation)}
                title={`Remove ${TYPE_LABEL[annotation.type]?.toLowerCase() || 'annotation'}`}
                aria-label={`Remove ${TYPE_LABEL[annotation.type]?.toLowerCase() || 'annotation'}`}
                className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[11px] font-medium text-text-secondary transition-colors duration-150 hover:bg-warning/10 hover:text-warning focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {annotations.length > 1 ? (
                  <>
                    <X className="h-3 w-3" strokeWidth={2} />
                    {TYPE_LABEL[annotation.type]}
                  </>
                ) : (
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
              </button>
            ))}
          </span>
        )}
      </div>
    </motion.div>
    </div>
  )
}

export default HighlightNote
