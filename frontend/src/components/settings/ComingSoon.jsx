import { motion, useReducedMotion } from 'framer-motion'
import { Download, Rocket, Users } from 'lucide-react'
import telescope from '../../assets/coming-soon-telescope.png'

// Both of these are deferred in CLAUDE.md — sharing is out of v0 entirely, and
// export beyond the Markdown one on Favorites isn't built. The card says
// "Soon" and nothing more precise, because a date would be a promise.
const UPCOMING = [
  {
    title: 'Shared vaults',
    description: 'Collaborate and share knowledge with others.',
    Icon: Users,
    tone: 'bg-primary-light text-primary',
  },
  {
    title: 'Export vault',
    description: 'Export your notes and highlights in multiple formats.',
    Icon: Download,
    tone: 'bg-secondary/10 text-secondary',
  },
]

// A telescope on a horizon — looking ahead, which is what the card is about.
//
// Decorative, so it keeps aria-hidden and an empty alt: the two upcoming
// features are listed as text directly below, and a screen reader announcing
// the picture would only repeat them. Width is fixed and height follows from
// the intrinsic ratio, so the art can never stretch.
function TelescopeArt() {
  return (
    <div aria-hidden="true" className="flex justify-center py-2">
      <img src={telescope} alt="" className="h-auto w-[180px] max-w-full" />
    </div>
  )
}

function ComingSoon() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
      className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border-subtle"
    >
      <h2 className="flex items-center gap-2 text-[17px] font-semibold text-text-primary">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-light text-accent">
          <Rocket className="h-4 w-4" strokeWidth={1.75} />
        </span>
        Coming soon
      </h2>
      <p className="mt-1.5 text-caption leading-relaxed text-text-secondary">
        We're working on these to make PM Content Vault even better.
      </p>

      <TelescopeArt />

      <ul className="mt-1 flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
        {UPCOMING.map(({ title, description, Icon, tone }) => (
          <li key={title} className="flex items-start gap-3 py-3.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-caption font-semibold text-text-primary">
                {title}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary">
                  Soon
                </span>
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </motion.aside>
  )
}

export default ComingSoon
