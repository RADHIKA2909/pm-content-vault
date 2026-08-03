import { useEffect, useRef, useState } from 'react'
import { Pencil, Sparkles } from 'lucide-react'

/**
 * One line of the AI's report, shown as prose with a pencil beside it.
 *
 * The read-only default is the point: an input box is an instruction to type,
 * and the review step is meant to be skimmed and approved, not filled in.
 * Editing is one click away but never the opening posture.
 *
 * Enter (or blur) commits, Escape reverts to the value the field had when
 * editing began — so a half-typed change can always be abandoned.
 */
function SuggestionField({
  label,
  value,
  onChange,
  placeholder = 'Not set',
  aiGenerated = false,
  multiline = false,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    el?.focus()
    // Caret to the end rather than selecting everything: this is a tweak to
    // the AI's wording far more often than a rewrite.
    el?.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  const begin = () => {
    committed.current = value
    setDraft(value)
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (draft !== committed.current) onChange(draft)
  }

  const cancel = () => {
    setDraft(committed.current)
    setEditing(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancel()
    }
    // Enter commits on a single line; a multiline field needs it for newlines,
    // so there ⌘↵ commits instead.
    if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      commit()
    }
  }

  const Tag = multiline ? 'textarea' : 'input'

  return (
    <div className="group/field">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-caption font-medium text-text-secondary">{label}</span>
        {aiGenerated && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-1.5 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
            AI
          </span>
        )}
        {!editing && (
          <button
            onClick={begin}
            aria-label={`Edit ${label.toLowerCase()}`}
            // Visible at rest, not revealed on hover. The read-only default
            // only reads as a deliberate choice if you can see that editing is
            // available — an invisible pencil just looks like a locked field.
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-text-secondary/70 transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>

      {editing ? (
        <Tag
          ref={inputRef}
          value={draft}
          rows={multiline ? 3 : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          className="w-full resize-y rounded-xl bg-surface px-3 py-2 text-body text-text-primary shadow-card ring-2 ring-primary transition-all duration-200 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus:outline-none"
        />
      ) : (
        <p
          onClick={begin}
          className={`cursor-text rounded-lg px-1 py-0.5 text-body leading-relaxed transition-colors duration-150 hover:bg-muted/70 ${
            value ? 'text-text-primary' : 'italic text-text-secondary'
          } ${multiline ? '' : 'truncate'}`}
        >
          {value || placeholder}
        </p>
      )}
    </div>
  )
}

export default SuggestionField
