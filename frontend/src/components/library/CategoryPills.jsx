import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { CATEGORIES } from '../../lib/categories.js'
import { categoryColor } from '../../lib/categoryColors.js'

const ALL = ''

/**
 * Quick category filter.
 *
 * Collapsed, this shows only categories you actually have content in, most-used
 * first — an empty category is not a useful thing to click. Expanding reveals
 * the rest of the taxonomy, dimmed, so it's still discoverable.
 *
 * Selection is a ring rather than a colour change: a pill that changes colour
 * when selected reads as a different category.
 */
function CategoryPills({ counts, total, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)

  const { used, unused } = useMemo(() => {
    const names = [...new Set([...CATEGORIES, ...Object.keys(counts)])]
    const byCount = (a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b)
    return {
      used: names.filter((n) => counts[n]).sort(byCount),
      unused: names.filter((n) => !counts[n]).sort((a, b) => a.localeCompare(b)),
    }
  }, [counts])

  const shown = expanded ? [...used, ...unused] : used

  // The selected pill grows slightly and takes a primary outline. That outline
  // is a *ring*, not a border: a border is part of the box, so adding one on
  // selection would widen the pill and shove every pill after it sideways.
  const pill = (name, active, empty) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-all duration-200 hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${categoryColor(
      name,
    )} ${
      active
        ? 'scale-[1.03] opacity-100 shadow-card ring-1 ring-primary'
        : empty
          ? 'opacity-45 hover:opacity-75'
          : 'opacity-90 hover:opacity-100 hover:shadow-card'
    }`

  return (
    <div className="flex items-start gap-2">
      {/* `p-1 -m-1` gives the row 4px of internal room while pulling the box
          back so nothing around it moves — padding pushes the content in, the
          negative margin pulls the border box out by the same amount.

          It's needed because `overflow-x: auto` also forces `overflow-y: auto`,
          making the collapsed row a scroll container that clipped the selected
          pill's ring and its scale-[1.03]. The ring lost its top stroke and
          read as colliding with the search bar — but only in the collapsed
          state, since the expanded row has no overflow. Applied to both so the
          two states are geometrically identical. */}
      <div
        className={`-m-1 min-w-0 flex-1 gap-2 p-1 ${
          expanded ? 'flex flex-wrap' : 'flex flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden'
        }`}
        style={expanded ? undefined : { scrollbarWidth: 'none' }}
      >
        <button
          onClick={() => onSelect(ALL)}
          aria-pressed={selected === ALL}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-caption font-medium transition-all duration-200 hover:-translate-y-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            selected === ALL
              ? 'scale-[1.03] bg-text-primary text-white shadow-card'
              : 'bg-surface text-text-secondary shadow-card ring-1 ring-border-subtle hover:text-text-primary'
          }`}
        >
          All items
          <span className={selected === ALL ? 'text-white/70' : 'text-text-secondary/70'}>{total}</span>
        </button>

        {shown.map((name) => {
          const count = counts[name] || 0
          return (
            <button
              key={name}
              onClick={() => onSelect(name === selected ? ALL : name)}
              aria-pressed={name === selected}
              className={pill(name, name === selected, count === 0)}
            >
              {name}
              <span className="opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {unused.length > 0 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-caption font-medium text-text-secondary shadow-card ring-1 ring-border-subtle transition-colors duration-200 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {expanded ? 'Less' : 'More'}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
        </button>
      )}
    </div>
  )
}

export default CategoryPills
