import { useMemo } from 'react'
import { CATEGORIES } from '../lib/categories.js'
import { categoryColor } from '../lib/categoryColors.js'

const ALL = ''

/**
 * Horizontal, wrapping category filter. Chips use the same colours as the
 * chips on the cards themselves, so a category looks identical wherever it
 * appears; selection is shown with a ring rather than a colour change, so it
 * doesn't read as a different category.
 *
 * `query` narrows which chips are shown, letting the one search box find both
 * items and the category you want to filter by.
 */
function CategoryFilterBar({ counts, total, selected, onSelect, query = '' }) {
  // Most-used first, so the categories worth filtering by lead. Unused
  // taxonomy values still appear, just at the end; ties fall back to
  // alphabetical so the order doesn't jitter between renders.
  const ordered = useMemo(() => {
    const names = new Set([...CATEGORIES, ...Object.keys(counts)])
    return [...names].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b))
  }, [counts])

  const q = query.trim().toLowerCase()
  const visible = ordered.filter(
    (name) =>
      !q ||
      name.toLowerCase().includes(q) ||
      // The active filter stays on screen even when it doesn't match the
      // query — otherwise it would vanish while still filtering the results,
      // leaving a short list with no visible explanation.
      name === selected,
  )

  const chipClass = (name, active) =>
    `rounded-full px-3 py-1.5 text-caption font-medium transition-all ${categoryColor(name)} ${
      active ? 'ring-2 ring-primary ring-offset-1' : 'opacity-80 hover:opacity-100'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onSelect(ALL)}
        className={`rounded-full px-3 py-1.5 text-caption font-medium transition-all ${
          selected === ALL
            ? 'bg-text-primary text-white ring-2 ring-primary ring-offset-1'
            : 'bg-muted text-text-secondary hover:text-text-primary'
        }`}
      >
        All items <span className="opacity-70">{total}</span>
      </button>

      {visible.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(name === selected ? ALL : name)}
          className={chipClass(name, name === selected)}
        >
          {name} <span className="opacity-70">{counts[name] || 0}</span>
        </button>
      ))}
    </div>
  )
}

export default CategoryFilterBar
