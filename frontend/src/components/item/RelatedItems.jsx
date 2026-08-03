import { Link } from 'react-router-dom'
import SourceThumbnail from '../SourceThumbnail.jsx'
import { CategoryChip } from '../Chip.jsx'
import { parseTitle } from '../../lib/parseTitle.js'

/**
 * Neighbours of this item, by embedding similarity.
 *
 * The percentage is the real cosine similarity the match_embeddings RPC
 * returns for the best-matching chunk — the route used to compute it and throw
 * it away. Showing it is what makes the list a ranking rather than an
 * unexplained pile of links.
 */
function RelatedItems({ items }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((related) => (
        <li key={related.id}>
          {/* A card rather than a list row: these are destinations, and the
              rail already has two lists in it. The lift on hover is the same
              one the Library cards use, so a neighbour looks like the thing
              you'd click there. */}
          <Link
            to={`/library/${related.id}`}
            className="group/related flex items-center gap-2.5 rounded-xl bg-surface p-2 shadow-card ring-1 ring-border-subtle transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="h-11 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <span className="block h-full w-full transition-transform duration-300 group-hover/related:scale-[1.04]">
                <SourceThumbnail item={related} />
              </span>
            </span>

            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-caption font-medium leading-snug text-text-primary">
                {parseTitle(related.title).title || related.summary || 'Untitled'}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                {related.category && <CategoryChip category={related.category} />}
                {typeof related.similarity === 'number' && (
                  <span className="text-[11px] tabular-nums text-text-secondary">
                    {Math.round(related.similarity * 100)}% similar
                  </span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default RelatedItems
