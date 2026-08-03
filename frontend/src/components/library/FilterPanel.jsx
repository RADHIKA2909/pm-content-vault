import { useMemo } from 'react'
import { ChevronDown, FolderOpen, SlidersHorizontal } from 'lucide-react'
import { CATEGORIES } from '../../lib/categories.js'
import { categoryColor } from '../../lib/categoryColors.js'
import { DATE_RANGES, DUPLICATE_FILTERS, SOURCE_FILTERS, activeFilterCount } from '../../lib/itemFilters.js'

// Native <select> on purpose: full keyboard support, correct behaviour on
// touch, and it can't drift out of sync with the platform. Only the chrome is
// restyled.
function Field({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-medium text-text-primary">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl bg-surface py-1.5 pl-2.5 pr-8 text-caption text-text-primary ring-1 ring-border-subtle transition-all duration-200 hover:ring-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
          strokeWidth={2}
        />
      </span>
    </label>
  )
}

function Switch({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-caption font-medium text-text-primary">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
          checked ? 'bg-primary' : 'bg-border-subtle'
        }`}
      >
        {/* `left-0` is load-bearing. Without it the knob is absolute with
            `left: auto`, so it falls back to its static position — and a
            <button> has `text-align: center` by UA default, which resolves
            that to 22px (the centre of the empty line box). The translate then
            stacked on top: the knob sat flush right when off and clear outside
            the track when on. */}
        <span
          className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-transform duration-200 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

// Sort deliberately isn't here — it changes the order of what you're looking
// at rather than narrowing it, so it belongs with the view toggle above the
// grid. Putting it in both places would be two controls for one setting.
function FilterPanel({ filters, onChange, counts, selectedCategory, onSelectCategory, showTitle = true }) {
  const active = activeFilterCount(filters)
  const set = (patch) => onChange({ ...filters, ...patch })

  // Every category, most-used first, with the unused taxonomy values after —
  // the pills above only show what's in use, so this is where you find out
  // that "Job Postings" exists and is empty.
  const ordered = useMemo(() => {
    const names = [...new Set([...CATEGORIES, ...Object.keys(counts)])]
    return names.sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b))
  }, [counts])

  return (
    <div className="space-y-2.5">
      {/* Stays at shadow-card while the content grid steps up to shadow-raised.
          The rail is a control surface, not content — it should sit below. */}
      <section className="rounded-2xl bg-surface p-3.5 shadow-card ring-1 ring-border-subtle">
        <div
          className={`flex items-center justify-between ${showTitle || active > 0 ? 'mb-2.5' : ''}`}
        >
          {showTitle && (
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <SlidersHorizontal className="h-4 w-4 text-text-secondary" strokeWidth={1.75} />
              Filters
              {active > 0 && (
                <span className="rounded-full bg-primary-light px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                  {active}
                </span>
              )}
            </h2>
          )}
          {active > 0 && (
            <button
              onClick={() => onChange({ source: '', date: '', duplicates: '', favoritesOnly: false })}
              className="ml-auto rounded-lg px-1.5 py-0.5 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          <Field label="Source" value={filters.source} options={SOURCE_FILTERS} onChange={(v) => set({ source: v })} />
          <Field label="Date added" value={filters.date} options={DATE_RANGES} onChange={(v) => set({ date: v })} />
          <Field
            label="Duplicates"
            value={filters.duplicates}
            options={DUPLICATE_FILTERS}
            onChange={(v) => set({ duplicates: v })}
          />
          <div className="border-t border-border-subtle pt-2.5">
            <Switch
              label="Only my favorites"
              checked={filters.favoritesOnly}
              onChange={(v) => set({ favoritesOnly: v })}
            />
          </div>
        </div>
      </section>

      {/* Deliberately not a card. Two stacked cards in the rail read as a
          second content column competing with the grid; flat here keeps the
          rail to one visual object. */}
      <section className="px-1 pt-1">
        <h2 className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Categories
        </h2>
        <ul className="-mx-0.5">
          {ordered.map((name) => {
            const count = counts[name] || 0
            const isSelected = name === selectedCategory
            return (
              <li key={name}>
                <button
                  onClick={() => onSelectCategory(isSelected ? '' : name)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected ? 'bg-primary-light' : 'hover:bg-muted'
                  } ${count === 0 ? 'opacity-55' : ''}`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${categoryColor(name)}`}
                  >
                    <FolderOpen className="h-3 w-3" strokeWidth={1.75} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-caption ${
                      isSelected ? 'font-semibold text-primary' : 'font-medium text-text-primary'
                    }`}
                  >
                    {name}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-text-secondary">{count}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

export default FilterPanel
