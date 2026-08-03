import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { apiFetch } from '../lib/apiFetch.js'
import { MAX_CATEGORIES } from '../lib/categories.js'

// Everything available to pick: the fixed taxonomy plus anything the user has
// invented before. Fetched once per mount — the list is small.
function useKnownCategories() {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let cancelled = false

    apiFetch(`/api/items/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => !cancelled && setCategories(data.map((c) => c.category)))
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  return categories
}

/**
 * Controlled list of category names, capped at MAX_CATEGORIES. Pick from ones
 * already in use or type a new one — the taxonomy is open, not fixed.
 *
 * An empty list is allowed here and means "let AI decide"; the server assigns
 * one on save so nothing ends up uncategorised.
 */
function CategoryPicker({ value = [], onChange, label = 'Categories', showChips = true }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const known = useKnownCategories()
  const wrapperRef = useRef(null)

  useEffect(() => {
    const onClickAway = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickAway)
    return () => document.removeEventListener('mousedown', onClickAway)
  }, [])

  const query = input.trim()
  const full = value.length >= MAX_CATEGORIES
  const alreadyOn = (name) => value.some((c) => c.toLowerCase() === name.toLowerCase())

  const suggestions = known
    .filter((c) => !alreadyOn(c))
    .filter((c) => !query || c.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  const canCreate = query && !known.some((c) => c.toLowerCase() === query.toLowerCase()) && !alreadyOn(query)

  const add = (name) => {
    const clean = name.trim().replace(/\s+/g, ' ')
    if (!clean || alreadyOn(clean) || full) return
    onChange([...value, clean])
    setInput('')
    setOpen(false)
  }

  const remove = (name) => onChange(value.filter((c) => c !== name))

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add(query || suggestions[0] || '')
    } else if (e.key === 'Backspace' && !input && value.length) {
      remove(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <p className="mb-1.5 flex items-center gap-1.5 text-caption font-medium text-text-secondary">
          {label}
          <span className="font-normal">
            ({value.length}/{MAX_CATEGORIES})
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border-subtle bg-surface p-2 text-sm focus-within:border-transparent focus-within:ring-2 focus-within:ring-primary">
        {/* Suppressed where the caller already renders the chips itself. */}
        {showChips &&
          value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-medium text-primary"
            >
              {name}
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remove category ${name}`}
                className="rounded-full hover:text-primary-hover"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={full}
          placeholder={
            full
              ? `Maximum ${MAX_CATEGORIES} categories`
              : value.length
                ? 'Add another...'
                : 'Let AI decide — or pick your own'
          }
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-0.5 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {open && !full && (suggestions.length > 0 || canCreate) && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-lg">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => add(name)}
              className="block w-full px-3 py-2 text-left text-caption text-text-primary hover:bg-muted"
            >
              {name}
            </button>
          ))}

          {canCreate && (
            <button
              type="button"
              onClick={() => add(query)}
              className="flex w-full items-center gap-1.5 border-t border-border-subtle px-3 py-2 text-left text-caption font-medium text-primary hover:bg-muted"
            >
              <Plus className="h-3.5 w-3.5" /> Create "{query}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoryPicker
