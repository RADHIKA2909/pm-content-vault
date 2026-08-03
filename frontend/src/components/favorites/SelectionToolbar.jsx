import { motion, useReducedMotion } from 'framer-motion'
import { Download, FolderInput, StarOff, Trash2, X } from 'lucide-react'

function Action({ Icon, label, onClick, disabled, danger = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-caption font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40 ${
        danger
          ? 'text-warning hover:bg-warning/10'
          : 'text-text-primary hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
      {label}
    </button>
  )
}

/**
 * Replaces the action bar while a selection is being built.
 *
 * It takes over the same row rather than appearing above it: two toolbars
 * stacked would push the whole grid down the moment you tick a card, which
 * makes the thing you just clicked move.
 */
function SelectionToolbar({ count, total, onSelectAll, onClear, onRemove, onMove, onExport, onDelete, busy }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="flex flex-wrap items-center gap-1 rounded-2xl bg-surface p-1.5 shadow-raised ring-1 ring-border-subtle"
    >
      <span className="ml-1.5 mr-1 shrink-0 text-caption font-semibold text-text-primary">
        {count} selected
      </span>

      <button
        onClick={count === total ? onClear : onSelectAll}
        className="shrink-0 rounded-lg px-2 py-1 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {count === total ? 'Clear' : `Select all ${total}`}
      </button>

      <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-border-subtle sm:block" />

      {/* Every action here is disabled with nothing selected rather than
          hidden — a toolbar whose buttons appear and vanish as you tick boxes
          is a toolbar that moves under your cursor. */}
      <Action Icon={StarOff} label="Remove from favorites" onClick={onRemove} disabled={!count || busy} />
      <Action Icon={FolderInput} label="Move category" onClick={onMove} disabled={!count || busy} />
      <Action Icon={Download} label="Export" onClick={onExport} disabled={!count || busy} />
      <Action Icon={Trash2} label="Delete" onClick={onDelete} disabled={!count || busy} danger />

      <button
        onClick={onClear}
        className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-caption font-medium text-text-secondary transition-colors duration-200 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="h-4 w-4" strokeWidth={2} /> Cancel
      </button>
    </motion.div>
  )
}

export default SelectionToolbar
