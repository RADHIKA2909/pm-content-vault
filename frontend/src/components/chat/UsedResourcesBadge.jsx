import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, Sparkles } from 'lucide-react'

/**
 * What the answer was built from, stated before the answer itself.
 *
 * This is the page's central claim — that the assistant is reasoning over the
 * user's own saved material — so it sits above every answer and is specific:
 * not "sources available" but five things, broken down by what they are.
 * Silent when nothing was cited, because then the claim isn't true.
 */
function UsedResourcesBadge({ count, breakdown = [] }) {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  if (!count) return null

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-success/10 py-1 pl-2.5 pr-2 text-caption font-medium text-success transition-colors duration-150 hover:bg-success/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-success"
      >
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        Used {count} saved {count === 1 ? 'resource' : 'resources'}
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && breakdown.length > 0 && (
          <motion.ul
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-1">
              {breakdown.map((row) => (
                <li key={row.label} className="flex items-center gap-1.5 text-[12px] text-text-secondary">
                  <span className="h-1 w-1 rounded-full bg-success/60" />
                  {row.count} {row.label}
                </li>
              ))}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UsedResourcesBadge
