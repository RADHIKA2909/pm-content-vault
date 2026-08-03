import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, SquareArrowOutUpRight } from 'lucide-react'
import SourceThumbnail from '../SourceThumbnail.jsx'
import SourceBadge from '../SourceBadge.jsx'
import { CategoryChip } from '../Chip.jsx'
import { parseTitle } from '../../lib/parseTitle.js'
import { savedAgo } from '../../lib/relativeTime.js'

/**
 * The saved items behind the answer, as cards you can open.
 *
 * Deliberately the same shape as a Library card — these *are* Library items,
 * and making them look like something else would suggest the assistant found
 * them somewhere other than the user's own vault. The meta row is the Library
 * card's exact pairing (source badge · saved when) for the same reason.
 *
 * The similarity is the real cosine score the retrieval RPC returned for that
 * passage — the number that decided the item was worth citing.
 */
function VaultExamples({ citations, onOpenAll }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const withItems = citations.filter((c) => c.item)
  if (!withItems.length) return null

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          <BookOpen className="h-3 w-3 text-primary" strokeWidth={2} />
          Examples from your vault
        </p>
        {onOpenAll && (
          <button
            onClick={onOpenAll}
            className="rounded-lg px-1.5 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {/* "See all 1" is nonsense — with one source the link is still
                worth having, since the drawer shows the passage and dates the
                card doesn't. */}
            {withItems.length === 1 ? 'View source' : `See all ${withItems.length}`} →
          </button>
        )}
      </div>

      {/* Horizontal rather than a grid: this sits inside an answer, and a grid
          of four would out-weigh the answer it belongs to. */}
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {withItems.map(({ index, item, similarity }) => (
          <motion.button
            key={index}
            whileHover={reduceMotion ? undefined : { y: -3 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => navigate(`/library/${item.id}`)}
            className="group/example flex w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl bg-surface text-left shadow-card ring-1 ring-border-subtle transition-shadow duration-200 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="relative block h-[86px] w-full overflow-hidden bg-muted">
              <span className="block h-full w-full transition-transform duration-300 group-hover/example:scale-[1.04]">
                <SourceThumbnail item={item} />
              </span>

              {/* These cards navigate away, and nothing else about them says
                  so. The affordance appears on hover rather than sitting there
                  permanently, which would compete with the thumbnail. */}
              <span className="absolute inset-0 flex items-center justify-center bg-text-primary/45 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover/example:opacity-100 group-focus-visible/example:opacity-100">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-text-primary shadow-card">
                  <SquareArrowOutUpRight className="h-3 w-3" strokeWidth={2} /> Open
                </span>
              </span>
            </span>

            <span className="flex flex-1 flex-col gap-1.5 p-2.5">
              <span className="line-clamp-2 text-caption font-medium leading-snug text-text-primary">
                {parseTitle(item.title).title || item.summary || 'Untitled'}
              </span>

              <span className="flex flex-wrap items-center gap-1.5">
                {item.category && <CategoryChip category={item.category} />}
                {typeof similarity === 'number' && (
                  <span className="text-[11px] tabular-nums text-text-secondary">
                    {Math.round(similarity * 100)}% match
                  </span>
                )}
              </span>

              <span className="mt-auto flex items-center gap-1.5 border-t border-border-subtle pt-1.5 text-[11px] text-text-secondary">
                <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
                <span aria-hidden="true">·</span>
                <time dateTime={item.created_at}>{savedAgo(item.created_at)}</time>
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

export default VaultExamples
