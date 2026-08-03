import { Highlighter, BookOpen } from 'lucide-react'

const MODES = [
  { value: 'read', label: 'Reading', hint: 'Distraction-free — just the content', Icon: BookOpen },
  { value: 'annotate', label: 'Annotate', hint: 'Select text to highlight, note or ask AI', Icon: Highlighter },
]

/**
 * Reading vs Annotate.
 *
 * Labelled rather than icon-only, because unlike grid/list the two states
 * change what selecting text *does* — a silent mode switch that turns the
 * selection toolbar off would read as a bug.
 */
function ReadingModeToggle({ mode, onChange }) {
  return (
    <div
      role="group"
      aria-label="Reading mode"
      className="relative flex rounded-xl bg-muted p-1 shadow-raised ring-1 ring-border-subtle"
    >
      {/* Filled rather than tinted. The old indicator was primary-light —
          barely a shade off white — so at a glance the control looked like two
          equally inactive buttons, and the mode you were in was a guess.
          A solid pill against a recessed track reads as selected from across
          the page. */}
      <span
        aria-hidden="true"
        className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg bg-primary shadow-card transition-transform duration-200 ease-out ${
          mode === 'annotate' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      {MODES.map(({ value, label, hint, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          title={hint}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-caption transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            mode === value
              ? 'font-semibold text-white'
              : 'font-medium text-text-secondary hover:text-text-primary'
          }`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={mode === value ? 2 : 1.75} />
          {label}
        </button>
      ))}
    </div>
  )
}

export default ReadingModeToggle
