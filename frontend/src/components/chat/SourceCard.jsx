import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ExternalLink, SquareArrowOutUpRight } from 'lucide-react'
import SourceThumbnail from '../SourceThumbnail.jsx'
import { CategoryChip } from '../Chip.jsx'
import { parseTitle } from '../../lib/parseTitle.js'
import { sourceUrl } from '../../lib/itemFilters.js'
import { savedAgoLong } from '../../lib/relativeTime.js'

/**
 * One cited item, expandable to the passage the answer actually used.
 *
 * The excerpt is the point of expanding: "Sources (2)" asks you to take the
 * citation on faith, while the retrieved passage lets you check the answer
 * against the words it came from.
 */
function SourceCard({ index, item, chunkText, similarity, delay = 0 }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  if (!item) return null

  const original = sourceUrl(item)

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut', delay: delay / 1000 }}
      className="overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-border-subtle"
    >
      <div className="flex items-start gap-2.5 p-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold tabular-nums text-text-secondary">
          {index}
        </span>

        <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
          <SourceThumbnail item={item} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-caption font-medium leading-snug text-text-primary">
            {parseTitle(item.title).title || item.summary || 'Untitled'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {item.category && <CategoryChip category={item.category} />}
            {typeof similarity === 'number' && (
              <span className="text-[11px] tabular-nums text-text-secondary">
                {Math.round(similarity * 100)}% match
              </span>
            )}
            <span className="text-[11px] text-text-secondary">Saved {savedAgoLong(item.created_at)}</span>
          </div>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Hide excerpt' : 'Show excerpt'}
          className="shrink-0 rounded-lg p-1 text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border-subtle px-2.5 pb-2.5 pt-2">
              <p className="line-clamp-6 text-[12px] leading-relaxed text-text-secondary">{chunkText}</p>

              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => navigate(`/library/${item.id}`)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-light px-2.5 py-1 text-[12px] font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <SquareArrowOutUpRight className="h-3 w-3" strokeWidth={2} /> Open item
                </button>

                {/* Only for items that have somewhere else to go — a note
                    written in the vault has no "original" to open. */}
                {original && (
                  <a
                    href={original}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ExternalLink className="h-3 w-3" strokeWidth={2} /> Open original
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default SourceCard
