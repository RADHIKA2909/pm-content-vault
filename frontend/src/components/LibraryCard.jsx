import { Star, ExternalLink, Trash2 } from 'lucide-react'
import { CategoryChip, DuplicateChip } from './Chip.jsx'
import SourceBadge from './SourceBadge.jsx'
import SourceThumbnail from './SourceThumbnail.jsx'
import { parseTitle } from '../lib/parseTitle.js'

function LibraryCard({ item, isFavorite, onOpen, onToggleFavorite, onDelete }) {
  const { title, subtitle } = parseTitle(item.title)

  return (
    <li
      onClick={() => onOpen(item.id)}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border-subtle bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-36 w-full overflow-hidden">
        <SourceThumbnail item={item} />
        <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-caption font-medium text-text-secondary backdrop-blur">
          <SourceBadge sourceType={item.source_type} />
        </span>
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
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <CategoryChip category={item.category} />
          {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
          <span className="ml-auto text-caption text-text-secondary">
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
            {item.summary || <span className="italic text-text-secondary">pending...</span>}
          </p>
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
