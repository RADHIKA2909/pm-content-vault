import { motion, useReducedMotion } from 'framer-motion'

const TONES = {
  primary: 'bg-primary-light text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  accent: 'bg-accent-light text-accent',
}

/**
 * One titled group of settings.
 *
 * The header sits above a divider and the rows below it, so a card with three
 * preferences reads as one subject rather than three floating controls — which
 * is the whole reason Settings is grouped at all.
 */
function SettingsCard({ icon: Icon, title, description, tone = 'primary', delay = 0, children }) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: delay / 1000 }}
      className="rounded-2xl bg-surface shadow-card ring-1 ring-border-subtle transition-shadow duration-200 hover:shadow-raised"
    >
      <header className="flex items-start gap-3 p-5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-tight text-text-primary">{title}</h2>
          <p className="mt-0.5 text-caption text-text-secondary">{description}</p>
        </div>
      </header>

      {/* Only drawn when there are rows: the Account card is a header on its
          own, and a divider under nothing is a line for the sake of a line. */}
      {children && <div className="border-t border-border-subtle">{children}</div>}
    </motion.section>
  )
}

export default SettingsCard
