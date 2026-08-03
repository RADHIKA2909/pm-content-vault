import { AlertTriangle, CircleHelp, Flame, Highlighter, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { HIGHLIGHT_SWATCH } from '../../lib/annotations.js'

const TYPE_ICON = {
  note: StickyNote,
  important: Flame,
  question: CircleHelp,
}

/**
 * Every mark on this item, in reading order — a contents page for the ideas
 * you picked out, not a log.
 *
 * Clicking an entry scrolls to the words it came from, which is what makes it
 * navigation rather than a list. Orphans are shown but not clickable: there is
 * nowhere left to send you.
 *
 * They're listed rather than hidden on purpose. An annotation whose text can
 * no longer be found is still something the user wrote, and dropping it
 * silently would look like the app lost their work.
 */
function AnnotationList({ annotations, orphanIds, onJump, onDelete }) {
  if (!annotations.length) {
    return (
      <div className="rounded-xl bg-muted/50 px-3 py-3">
        <p className="flex items-center gap-1.5 text-caption font-medium text-text-primary">
          <Highlighter className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
          Nothing highlighted yet
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          Select any text in the article to highlight it, attach a note, or ask AI about it. Everything you
          mark shows up here as a jump list.
        </p>
      </div>
    )
  }

  return (
    <ul className="-mx-1 flex max-h-[420px] flex-col gap-0.5 overflow-y-auto">
      {annotations.map((annotation) => {
        const orphaned = orphanIds.has(annotation.id)
        const Icon = TYPE_ICON[annotation.type] || (orphaned ? AlertTriangle : Highlighter)

        return (
          <li key={annotation.id}>
            <div className="group/annotation flex gap-2 rounded-xl px-1.5 py-1.5 transition-colors duration-150 hover:bg-muted/60">
              <span
                aria-hidden="true"
                className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${
                  annotation.type === 'highlight'
                    ? HIGHLIGHT_SWATCH[annotation.color] || HIGHLIGHT_SWATCH.yellow
                    : 'bg-primary/40'
                }`}
              />

              <button
                onClick={() => !orphaned && onJump(annotation.id)}
                disabled={orphaned}
                title={orphaned ? undefined : 'Jump to this passage'}
                className="min-w-0 flex-1 text-left transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary enabled:group-hover/annotation:translate-x-0.5"
              >
                <p
                  className={`line-clamp-2 text-caption leading-relaxed ${
                    orphaned ? 'italic text-text-secondary line-through' : 'text-text-primary'
                  }`}
                >
                  {annotation.quote}
                </p>

                {annotation.note && (
                  // The clamp goes on the span, not the flex row: line-clamp
                  // needs display:-webkit-box, and `flex` on the same element
                  // silently wins — a saved AI answer then ran to full length.
                  <p className="mt-1 flex gap-1.5 text-[12px] leading-relaxed text-text-secondary">
                    <Icon className="mt-0.5 h-3 w-3 shrink-0 text-primary" strokeWidth={1.75} />
                    <span className="line-clamp-3 min-w-0">{annotation.note}</span>
                  </p>
                )}

                {annotation.ai_meta?.action && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                    {annotation.ai_meta.action}
                  </span>
                )}

                {orphaned && (
                  <p className="mt-1 text-[11px] text-warning">
                    This text is no longer in the content — the annotation is kept, but can't be shown in
                    place.
                  </p>
                )}
              </button>

              <button
                onClick={() => onDelete(annotation)}
                aria-label="Delete annotation"
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-secondary/60 opacity-0 transition-all duration-150 hover:bg-warning/10 hover:text-warning focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/annotation:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default AnnotationList
