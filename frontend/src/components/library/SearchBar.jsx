import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

function SearchBar({ value, onChange, placeholder = 'Search your vault — content, summaries, categories...' }) {
  const inputRef = useRef(null)
  const [focused, setFocused] = useState(false)
  const [mac, setMac] = useState(true)

  useEffect(() => setMac(isMac()), [])

  // ⌘K / Ctrl+K focuses from anywhere on the page. Guarded so it doesn't steal
  // the keystroke from another field the user is already typing in.
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
        return
      }
      if (key === 'escape' && document.activeElement === inputRef.current) {
        if (value) onChange('')
        else inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [value, onChange])

  return (
    <div className="relative">
      <Search
        className={`pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 transition-colors duration-200 ${
          focused ? 'text-primary' : 'text-text-secondary'
        }`}
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        type="search"
        placeholder={placeholder}
        aria-label="Search your vault"
        // `[&::-webkit-search-cancel-button]:hidden` — type=search gives Escape
        // handling for free but also a native clear button that would sit next
        // to ours.
        // py-4 puts this at ~54.5px (32px padding + ~22.5px line box) — search
        // is the primary interaction, so it sits at shadow-raised with the
        // content cards rather than at the filter rail's shadow-card.
        className="w-full rounded-2xl bg-surface py-4 pl-12 pr-24 text-body text-text-primary shadow-raised ring-1 ring-border-subtle transition-all duration-200 placeholder:text-text-secondary hover:ring-text-secondary/30 focus:shadow-[0_0_0_5px_rgba(99,102,241,0.14)] focus:outline-none focus:ring-2 focus:ring-primary [&::-webkit-search-cancel-button]:hidden"
      />

      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
        {value && (
          <button
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="flex h-6 w-6 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        )}
        {!value && !focused && (
          <kbd className="hidden select-none items-center gap-0.5 rounded-md bg-muted px-1.5 py-1 text-[11px] font-medium text-text-secondary sm:flex">
            {mac ? '⌘' : 'Ctrl'} K
          </kbd>
        )}
      </div>
    </div>
  )
}

export default SearchBar
