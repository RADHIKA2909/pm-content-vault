/**
 * A real radio group — `<input type="radio">` with a shared name, not divs
 * pretending. Arrow keys move between options and screen readers announce the
 * set, both for free, and neither is worth reimplementing.
 */
function RadioGroup({ name, value, options, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((option) => {
        const active = option.value === value
        return (
          <label
            key={option.value}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-caption font-medium transition-colors duration-200 ${
              active
                ? 'bg-primary-light text-primary'
                : 'text-text-secondary hover:bg-muted hover:text-text-primary'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {/* Drawn rather than native: the platform radio can't be recoloured
                to the palette, and its focus ring is the browser's, not ours. */}
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 items-center justify-center rounded-full ring-1 transition-colors duration-200 ${
                active ? 'ring-primary' : 'ring-border-subtle'
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            {option.label}
          </label>
        )
      })}
    </div>
  )
}

export default RadioGroup
