import { motion, useReducedMotion } from 'framer-motion'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { PHASES } from '../../lib/chatApi.js'

/**
 * What the assistant is doing, while it does it.
 *
 * Every row ticks over on a real server event — retrieval finishing, the vault
 * index loading, generation starting — and each carries the number that step
 * produced. A status list driven by a timer would tell the user "searching
 * your vault" for a fixed 800ms whether or not anything was searched, which is
 * decoration wearing the costume of progress.
 */
function StreamingStatus({ phases }) {
  const reduceMotion = useReducedMotion()
  const activeIndex = PHASES.findIndex((p) => !phases[p.key]?.done)

  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
      {/* Same signature the finished answer carries, so the card doesn't
          restyle itself the moment the answer lands. */}
      <div className="mb-3 flex items-center gap-1.5 border-b border-border-subtle pb-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-light">
          <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.25} />
        </span>
        <span className="text-caption font-semibold text-text-primary">Vault AI</span>
      </div>

      <div>
        <ul className="flex flex-col gap-2">
          {PHASES.map((phase, i) => {
            const state = phases[phase.key]
            const done = Boolean(state?.done)
            // Only the first unfinished row is "running"; the rest are pending,
            // so the list never shows two things happening at once.
            const running = i === activeIndex

            return (
              <motion.li
                key={phase.key}
                initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: done || running ? 1 : 0.45, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex items-center gap-2"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
                  ) : running ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" strokeWidth={2} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-border-subtle" />
                  )}
                </span>

                <span className={`text-caption ${done ? 'text-text-secondary' : 'text-text-primary'}`}>
                  {phase.label}
                </span>

                {done && state.detail && (
                  <span className="ml-auto text-[11px] tabular-nums text-text-secondary">
                    {state.detail}
                  </span>
                )}
              </motion.li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export default StreamingStatus
