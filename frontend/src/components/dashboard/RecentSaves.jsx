import { Clock, FileStack } from 'lucide-react'
import SectionCard from './SectionCard.jsx'
import SourceThumbnail from '../SourceThumbnail.jsx'
import SourceBadge from '../SourceBadge.jsx'
import { CategoryChip } from '../Chip.jsx'
import { parseTitle } from '../../lib/parseTitle.js'
import { itemCategories } from '../../lib/categories.js'

function relativeTime(iso) {
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1d ago' : `${days}d ago`
}

/**
 * Miniature versions of the real Library cards — same SourceThumbnail and
 * SourceBadge, so a saved item looks the same wherever it appears rather than
 * being a second look-alike implementation.
 */
function RecentSaves({ items, onOpen, onViewAll, delay = 0 }) {
  return (
    <SectionCard
      icon={Clock}
      title="Recent Saves"
      subtitle="Your latest saved resources."
      delay={delay}
      action={
        <button onClick={onViewAll} className="shrink-0 text-caption font-medium text-primary hover:underline">
          View all
        </button>
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-8 text-center">
          <FileStack className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
          <p className="text-sm text-text-primary">Nothing saved yet</p>
          <p className="text-caption text-text-secondary">Add your first resource to get started.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {items.map((item) => {
            const { title } = parseTitle(item.title)
            const categories = itemCategories(item)

            return (
              <li key={item.id}>
                <button
                  onClick={() => onOpen(item.id)}
                  className="group flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface text-left shadow-card ring-1 ring-border-subtle/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="block h-[82px] w-full overflow-hidden">
                    <span className="block h-full w-full transition-transform duration-300 group-hover:scale-[1.02]">
                      <SourceThumbnail item={item} />
                    </span>
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
                    <span className="truncate text-sm font-medium text-text-primary">
                      {title || item.summary || item.raw_content}
                    </span>

                    <span className="mt-auto flex items-center gap-1.5">
                      {categories.slice(0, 1).map((c) => (
                        <CategoryChip key={c} category={c} />
                      ))}
                      <span className="ml-auto flex shrink-0 items-center gap-1 text-[11px] text-text-secondary">
                        <SourceBadge sourceType={item.source_type} linkType={item.link_type} showLabel={false} />
                        {relativeTime(item.created_at)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}

export default RecentSaves
