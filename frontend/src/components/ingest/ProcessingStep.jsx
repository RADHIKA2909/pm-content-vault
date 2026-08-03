import { AlertCircle, Check, Minus, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { PHASES } from '../../lib/composeApi.js'

/**
 * Every row here changes status on a real server event, never on a timer.
 * That's the whole reason /analyze streams: a checklist paced by setTimeout
 * looks identical when things go well and lies the moment the model is slow.
 *
 * The liveliness comes from motion instead — the list staggers in, the active
 * row breathes, and checks pop as they land. None of that claims progress that
 * hasn't happened.
 */
function ProcessingStep({ phases }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {!reduceMotion && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-primary/10"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.span
              className="absolute inset-3 rounded-full bg-primary/10"
              animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.15, 0.4] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
          </>
        )}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </span>
      </div>

      <h3 className="mt-4 text-[19px] font-semibold tracking-tight text-text-primary">
        Understanding your content
      </h3>

      <ul className="mt-5 w-full max-w-md space-y-1.5">
        {PHASES.map(({ key, label, hint }, i) => {
          const status = phases[key] || 'pending'
          const active = status === 'active'

          return (
            <motion.li
              key={key}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut', delay: i * 0.07 }}
              className={`relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition-colors duration-300 ${
                active ? 'bg-primary-light/60' : 'bg-muted/50'
              }`}
            >
              {/* A sweep across the row that is running. Purely a "this is the
                  one we're waiting on" cue — it carries no completion
                  information, so it can't misreport anything. */}
              {active && !reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  animate={{ x: ['-120%', '420%'] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                {status === 'done' ? (
                  <motion.span
                    initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.24, ease: [0.34, 1.5, 0.64, 1] }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                ) : active ? (
                  <motion.span
                    className="h-2.5 w-2.5 rounded-full bg-primary"
                    animate={reduceMotion ? {} : { scale: [1, 0.7, 1], opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : status === 'failed' ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/15 text-warning">
                    <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                ) : status === 'skipped' ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-text-secondary">
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-border-subtle" />
                )}
              </span>

              <span className="relative min-w-0 flex-1">
                <span
                  className={`block text-sm transition-colors duration-300 ${
                    status === 'pending' || status === 'skipped'
                      ? 'text-text-secondary'
                      : 'font-medium text-text-primary'
                  }`}
                >
                  {label}
                </span>
                <span className="block text-caption text-text-secondary">
                  {status === 'failed'
                    ? "Couldn't run — you can still fill this in yourself"
                    : status === 'skipped'
                      ? "Turned off — you'll fill this in yourself"
                      : hint}
                </span>
              </span>
            </motion.li>
          )
        })}
      </ul>

      <p className="mt-4 text-caption text-text-secondary">Usually takes 5–15 seconds.</p>
    </div>
  )
}

export default ProcessingStep
