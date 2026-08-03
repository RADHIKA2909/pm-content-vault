import { useState } from 'react'
import { AlertCircle, AlertTriangle, Check, Info, Pencil, Sparkles, WandSparkles } from 'lucide-react'
import CategoryPicker from '../CategoryPicker.jsx'
import { CategoryChip } from '../Chip.jsx'
import SuggestionField from './SuggestionField.jsx'
import { savedAgoLong } from '../../lib/relativeTime.js'
import { inputClass } from './inputs/SimpleInputs.jsx'

/**
 * The AI's report on what you're about to save.
 *
 * Everything opens read-only. The user rarely disagrees with the model, so the
 * screen is built for skimming and approving — each section reveals a pencil on
 * hover, and only that section becomes editable when clicked. Opening as a wall
 * of inputs framed the AI's work as a draft to be corrected.
 */
function ReviewStep({ draft, value, onChange, onOpenDuplicate }) {
  const [editingCategories, setEditingCategories] = useState(false)
  const set = (patch) => onChange({ ...value, ...patch })
  const { suggestions, duplicate, aiWarning } = draft

  // The chip marks what the AI wrote and disappears the moment you change it.
  // It's the honest version of a confidence score: the model has no calibrated
  // certainty to report, but authorship is something we actually know.
  const fromAi = (field) => value.edited?.[field] !== true && Boolean(suggestions?.[field])

  const edit = (field) => (next) =>
    set({ [field]: next, edited: { ...(value.edited || {}), [field]: true } })

  return (
    <div className="space-y-3.5">
      {aiWarning && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-caption text-warning">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          {aiWarning}
        </p>
      )}

      {/* Only rendered above ~0.92 cosine similarity, so its presence already
          means "this is close to something you have". */}
      {duplicate && (
        <div className="rounded-xl bg-warning/[0.07] p-3.5 ring-1 ring-warning/20">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">Similar content found</p>
              <p className="mt-1 truncate text-body font-medium text-text-primary">
                {(duplicate.title || 'An earlier item').split('::')[0]}
              </p>
              <p className="mt-0.5 text-caption text-text-secondary">
                {/* A real pgvector cosine score, not an estimate. */}
                Saved {savedAgoLong(duplicate.created_at)} · {Math.round(duplicate.similarity * 100)}% similar
              </p>
              <button
                onClick={() => onOpenDuplicate(duplicate.id)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-caption font-medium text-text-primary shadow-card ring-1 ring-border-subtle transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                View existing
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <SuggestionField
            label="Title"
            value={value.title}
            onChange={edit('title')}
            placeholder="Give it a short name"
            aiGenerated={fromAi('title')}
          />
          <SuggestionField
            label="Subtitle"
            value={value.subtitle}
            onChange={edit('subtitle')}
            placeholder="A few words of context"
            aiGenerated={fromAi('subtitle')}
          />
        </div>

        <div className="mt-3.5 border-t border-border-subtle pt-3.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-caption font-medium text-text-secondary">Category</span>
            {!value.edited?.categories && value.categories.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-1.5 py-0.5 text-[11px] font-medium text-primary">
                <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                AI
              </span>
            )}
            {!editingCategories && (
              <button
                onClick={() => setEditingCategories(true)}
                aria-label="Edit categories"
                className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {editingCategories ? (
            <div>
              <CategoryPicker
                value={value.categories}
                onChange={(next) =>
                  set({ categories: next, edited: { ...(value.edited || {}), categories: true } })
                }
                label=""
              />
              <button
                onClick={() => setEditingCategories(false)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption font-medium text-primary transition-colors hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> Done
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {value.categories.length > 0 ? (
                value.categories.map((category) => <CategoryChip key={category} category={category} />)
              ) : (
                <span className="text-body italic text-text-secondary">None chosen yet</span>
              )}
            </div>
          )}

          {/* The model's own account of its choice. Attributed to the AI
              rather than stated as fact — it's a post-hoc explanation, not a
              verified property of the content. */}
          {suggestions?.categoryReason && !value.edited?.categories && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary-light/40 px-2.5 py-2 text-caption leading-relaxed text-text-secondary">
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
              <span>
                <span className="font-medium text-text-primary">Why this category? </span>
                {suggestions.categoryReason}
              </span>
            </p>
          )}
        </div>

        <div className="mt-3.5 border-t border-border-subtle pt-3.5">
          <SuggestionField
            label="Summary"
            value={value.summary}
            onChange={edit('summary')}
            placeholder="One or two lines describing this"
            aiGenerated={fromAi('summary')}
            multiline
          />
        </div>
      </div>

      {value.keyPoints.length > 0 && <KeyPointsCard value={value} set={set} />}

      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
        <SuggestionField
          label="Add your thoughts (optional)"
          value={value.notes}
          onChange={(next) => set({ notes: next })}
          placeholder="Anything you want to remember about this..."
          multiline
        />
      </div>
    </div>
  )
}

// The AI's reading of the content, styled as something to read rather than
// something to fill in. One edit action opens the whole list — a textarea per
// bullet turned the most valuable output on the screen into a form.
function KeyPointsCard({ value, set }) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="rounded-2xl bg-primary-light/40 p-4 ring-1 ring-primary/10">
      <div className="mb-2.5 flex items-center gap-1.5">
        <WandSparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
        <span className="text-caption font-semibold text-text-primary">Key points</span>
        {!value.edited?.keyPoints && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
            AI
          </span>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          aria-label={editing ? 'Done editing key points' : 'Edit key points'}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {editing ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />}
        </button>
      </div>

      <ul className="space-y-2">
        {value.keyPoints.map((point, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            {editing ? (
              <textarea
                value={point}
                rows={2}
                onChange={(e) => {
                  const next = [...value.keyPoints]
                  next[i] = e.target.value
                  set({ keyPoints: next, edited: { ...(value.edited || {}), keyPoints: true } })
                }}
                className={`${inputClass} min-h-0 resize-y py-1.5 text-caption`}
              />
            ) : (
              <span className="text-body leading-relaxed text-text-primary">{point}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ReviewStep
