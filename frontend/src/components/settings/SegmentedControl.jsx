/**
 * Two or three mutually exclusive options, with the selection sliding between
 * them.
 *
 * Same pattern as `components/library/ViewToggle.jsx` and the item page's
 * reading-mode toggle: an indicator that moves reads as one control changing
 * state, where recolouring two buttons reads as two separate things.
 */
function SegmentedControl({ value, options, onChange, label }) {
  const index = Math.max(
    options.findIndex((o) => o.value === value),
    0,
  )

  return (
    <div
      role="group"
      aria-label={label}
      className="relative flex rounded-xl bg-muted p-1 shadow-raised ring-1 ring-border-subtle"
    >
      {/* Width and offset are computed from the option count so the indicator
          lines up for two or three segments without a second class name. */}
      <span
        aria-hidden="true"
        style={{
          width: `calc(${100 / options.length}% - ${(8 * (options.length - 1)) / options.length}px)`,
          transform: `translateX(calc(${index * 100}% + ${index * 4}px))`,
        }}
        className="absolute inset-y-1 left-1 rounded-lg bg-surface shadow-card transition-transform duration-200 ease-out"
      />

      {options.map(({ value: option, label: text, icon: Icon }) => {
        const active = option === value
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-caption transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active ? 'font-semibold text-primary' : 'font-medium text-text-secondary hover:text-text-primary'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2 : 1.75} />}
            {text}
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl
