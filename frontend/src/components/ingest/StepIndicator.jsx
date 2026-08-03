import { Check } from 'lucide-react'
import { motion } from 'framer-motion'

export const STEPS = [
  { key: 'choose', label: 'Choose content' },
  { key: 'processing', label: 'AI understanding' },
  { key: 'review', label: 'Review' },
  { key: 'saved', label: 'Saved' },
]

// Progress, not navigation: the steps aren't clickable because you can't jump
// to a review that hasn't been produced yet. Completed steps collapse to a
// check so the eye lands on the one that's live.
function StepIndicator({ current }) {
  const index = STEPS.findIndex((s) => s.key === current)

  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((step, i) => {
        const state = i < index ? 'done' : i === index ? 'active' : 'todo'
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                  state === 'done'
                    ? 'bg-success/15 text-success'
                    : state === 'active'
                      ? 'bg-primary text-white'
                      : 'bg-muted text-text-secondary'
                }`}
              >
                {state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={`hidden text-caption transition-colors duration-300 sm:block ${
                  state === 'active' ? 'font-semibold text-text-primary' : 'text-text-secondary'
                }`}
              >
                {step.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <span className="relative mx-1 block h-px w-5 overflow-hidden bg-border-subtle sm:w-8">
                <motion.span
                  className="absolute inset-0 block bg-success/60 origin-left"
                  initial={false}
                  animate={{ scaleX: i < index ? 1 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export default StepIndicator
