import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bold,
  Copy,
  Italic,
  MessageSquarePlus,
  Sparkles,
  Strikethrough,
  Underline,
  CircleHelp,
  Flame,
} from 'lucide-react'
import { HIGHLIGHT_COLORS, HIGHLIGHT_SWATCH } from '../../lib/annotations.js'

// Grouped by what the action does to the text, in the order a reader reaches
// for them: colour it, style it, say something about it, ask about it.
const FORMATS = [
  { type: 'bold', Icon: Bold, label: 'Bold' },
  { type: 'italic', Icon: Italic, label: 'Italic' },
  { type: 'underline', Icon: Underline, label: 'Underline' },
  { type: 'strikethrough', Icon: Strikethrough, label: 'Strikethrough' },
]

const MARKS = [
  { type: 'important', Icon: Flame, label: 'Mark as important' },
  { type: 'question', Icon: CircleHelp, label: 'Flag as a question' },
]

function IconButton({ Icon, label, onClick, tone = 'default' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        tone === 'primary'
          ? 'text-primary hover:bg-primary-light'
          : 'text-text-secondary hover:bg-muted hover:text-text-primary'
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  )
}

const Divider = () => <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border-subtle" />

/**
 * Floats above the current selection.
 *
 * Positioned by the caller in wrapper-relative coordinates, then clamped here
 * against its own measured width — a selection near either edge would
 * otherwise push half the toolbar out of the page.
 */
function SelectionToolbar({ x, y, flip, onHighlight, onFormat, onNote, onAi, onCopy }) {
  const ref = useRef(null)
  const [left, setLeft] = useState(x)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    const parent = el?.offsetParent
    if (!el || !parent) return

    const half = el.offsetWidth / 2
    const limit = parent.clientWidth
    // 8px of breathing room so it never sits flush against the column edge.
    setLeft(Math.min(Math.max(x, half + 8), Math.max(limit - half - 8, half + 8)))
  }, [x])

  return (
    // Two elements, and it has to stay that way: Framer writes the animated
    // transform inline, which wholly replaces Tailwind's translate utilities.
    // With both on one element the toolbar lost its centring and its flip, and
    // rendered on top of the line below the selection.
    <div
      ref={ref}
      style={{ left, top: y }}
      className={`absolute z-30 -translate-x-1/2 ${flip ? '' : '-translate-y-full'}`}
    >
      <motion.div
        role="toolbar"
        aria-label="Annotate selection"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: flip ? -4 : 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.14, ease: 'easeOut' }}
        // Selecting text then clicking a button would collapse the selection
        // before the handler runs, so the toolbar refuses the mousedown.
        onMouseDown={(e) => e.preventDefault()}
        className="flex max-w-[calc(100vw-2rem)] items-center gap-0.5 overflow-x-auto rounded-xl bg-surface p-1 shadow-card-hover ring-1 ring-border-subtle"
      >
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onHighlight(color)}
            title={`Highlight ${color}`}
            aria-label={`Highlight ${color}`}
            className="flex h-8 w-6 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className={`h-4 w-4 rounded-full ring-1 ring-black/5 ${HIGHLIGHT_SWATCH[color]}`} />
          </button>
        ))}

        <Divider />
        {FORMATS.map(({ type, Icon, label }) => (
          <IconButton key={type} Icon={Icon} label={label} onClick={() => onFormat(type)} />
        ))}

        <Divider />
        <IconButton Icon={MessageSquarePlus} label="Add note" onClick={onNote} />
        {MARKS.map(({ type, Icon, label }) => (
          <IconButton key={type} Icon={Icon} label={label} onClick={() => onFormat(type)} />
        ))}

        <Divider />
        {/* Labelled, unlike every other control here. Asking AI about a
            passage is the one action on this bar that opens something rather
            than marking something, and as a bare sparkle it read as decoration
            — people don't click an icon whose outcome they can't guess. */}
        <button
          onClick={onAi}
          aria-label="Ask AI about this"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary-light px-2.5 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Ask AI
        </button>
        <IconButton Icon={Copy} label="Copy" onClick={onCopy} />
      </motion.div>
    </div>
  )
}

export default SelectionToolbar
