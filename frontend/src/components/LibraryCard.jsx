import { Star, ExternalLink, Trash2 } from 'lucide-react'
import { CategoryChip, DuplicateChip } from './Chip.jsx'
import SourceBadge from './SourceBadge.jsx'
import SourceThumbnail from './SourceThumbnail.jsx'
import { parseTitle } from '../lib/parseTitle.js'
import { itemCategories } from '../lib/categories.js'

function LibraryCard({ item, isFavorite, onOpen, onToggleFavorite, onDelete }) {
  const { title, subtitle } = parseTitle(item.title)
  const categories = itemCategories(item)

  return (
    <li
      onClick={() => onOpen(item.id)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border-subtle bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-36 w-full overflow-hidden">
        <SourceThumbnail item={item} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(item.id, isFavorite)
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 backdrop-blur transition-colors hover:bg-surface"
        >
          <Star
            className={`h-4 w-4 ${isFavorite ? 'fill-accent text-accent' : 'text-text-secondary'}`}
            strokeWidth={1.75}
          />
        </button>
      </div>

      <div className="p-4">
        {/* Source sits here rather than over the thumbnail — as an overlay it
            covered the headline of image-heavy saves. */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-caption text-text-secondary">
            <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
            <span aria-hidden="true">·</span>
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </div>

        {title ? (
          <>
            <p className="truncate text-[17px] font-semibold text-text-primary">{title}</p>
            {subtitle && <p className="mt-0.5 truncate text-caption text-text-secondary">{subtitle}</p>}
          </>
        ) : (
          <p className="truncate text-body text-text-primary">
            {item.summary || item.raw_content || (
              <span className="italic text-text-secondary">No AI summary</span>
            )}
          </p>
        )}

        {/* All of the item's categories, below the title as requested — an
            item can carry up to three. */}
        {categories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <CategoryChip key={category} category={category} />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onOpen(item.id)
            }}
            className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
            className="ml-auto flex items-center gap-1 text-caption font-medium text-text-secondary hover:text-warning"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

export default LibraryCard
