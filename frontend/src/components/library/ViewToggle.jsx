import { LayoutGrid, List } from 'lucide-react'

const VIEWS = [
  { value: 'grid', label: 'Grid view', Icon: LayoutGrid },
  { value: 'list', label: 'List view', Icon: List },
]

// Segmented control with a sliding indicator: the highlight moves between the
// two positions rather than being repainted, so the switch reads as one control
// changing state instead of two buttons swapping colour.
//
// No tray of its own — this lives inside the toolbar shell, and a nested
// background here would read as a control floating inside another control.
function ViewToggle({ view, onChange }) {
  return (
    <div role="group" aria-label="View" className="relative flex p-0.5">
      <span
        aria-hidden="true"
        className={`absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-lg bg-muted transition-transform duration-200 ease-out ${
          view === 'list' ? 'translate-x-full' : 'translate-x-0'
        }`}
      />
      {VIEWS.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          aria-label={label}
          aria-pressed={view === value}
          title={label}
          className={`relative z-10 flex h-7 w-8 items-center justify-center rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            view === value ? 'text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}

export default ViewToggle
