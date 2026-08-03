import { motion, useReducedMotion } from 'framer-motion'
import { Download, Rocket, Users } from 'lucide-react'

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

// Line-art in the same idiom as the other decorations: flat shapes, low
// opacity, palette colours, no gradients. A telescope on a horizon — looking
// ahead, which is what the card is about.
function TelescopeArt() {
  return (
    <div aria-hidden="true" className="relative flex justify-center py-2">
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.06] blur-2xl" />
      <svg viewBox="0 0 180 110" fill="none" className="relative h-[110px] w-[180px]">
        <circle cx="90" cy="52" r="38" className="text-primary" fill="currentColor" opacity="0.07" />

        <g className="text-primary">
          <rect
            x="74"
            y="28"
            width="56"
            height="17"
            rx="8.5"
            fill="currentColor"
            opacity="0.85"
            transform="rotate(-22 102 36)"
          />
          <circle cx="126" cy="24" r="10" fill="currentColor" opacity="0.35" />
          <path d="M90 52L78 88M90 52L102 88M84 74H96" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        </g>

        <path d="M28 92H152" className="text-border-subtle" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

        <g className="text-secondary">
          <path d="M40 34C41 38.5 42.5 40 47 41C42.5 42 41 43.5 40 48C39 43.5 37.5 42 33 41C37.5 40 39 38.5 40 34Z" fill="currentColor" opacity="0.5" />
          <path d="M152 56C152.8 59.6 154 60.8 157.6 61.6C154 62.4 152.8 63.6 152 67.2C151.2 63.6 150 62.4 146.4 61.6C150 60.8 151.2 59.6 152 56Z" fill="currentColor" opacity="0.35" />
        </g>
        <circle cx="58" cy="20" r="2.5" className="text-warning" fill="currentColor" opacity="0.45" />
        <circle cx="140" cy="80" r="2" className="text-primary" fill="currentColor" opacity="0.3" />
      </svg>
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
