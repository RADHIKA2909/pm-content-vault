import { ChevronRight, FolderOpen, LayoutGrid } from 'lucide-react'
import SectionCard from './SectionCard.jsx'
import { categoryColor, categoryTint } from '../../lib/categoryColors.js'

// Colour here is deliberate: the brief keeps the page near-monochrome and lets
// categories carry the colour. Both the icon well and the tile wash come from
// lib/categoryColors.js, so a category reads identically here and in Library.
function CategoryBrowser({ categories, onOpen, delay = 0 }) {
  return (
    <SectionCard
      icon={LayoutGrid}
      title="Browse by Category"
      subtitle="Explore your content by topic."
      delay={delay}
    >
      {categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-8 text-center">
          <FolderOpen className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
          <p className="text-sm text-text-primary">No categories yet</p>
          <p className="text-caption text-text-secondary">They appear as you save content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {categories.map(([name, count]) => (
            <button
              key={name}
              onClick={() => onOpen(name)}
              className={`group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${categoryTint(name)}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105 ${categoryColor(name)}`}
              >
                <FolderOpen className="h-4 w-4" strokeWidth={1.75} />
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">{name}</span>

              <span className="shrink-0 rounded-full bg-surface/80 px-2 py-0.5 text-caption font-medium text-text-secondary">
                {count}
              </span>

              <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text-primary" />
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

export default CategoryBrowser
