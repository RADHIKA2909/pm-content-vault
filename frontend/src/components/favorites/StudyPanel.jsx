import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, GraduationCap, Layers, Link2, Sparkles } from 'lucide-react'

/**
 * The right rail: what to actually do with the favourites you've collected.
 *
 * Deliberately not a second copy of the callout at the foot of the page. Two
 * panels a screen apart saying "use AI on your favourites" is one message
 * repeated, not two features — so this one is specific and actionable, and the
 * bottom one stays a quiet tip.
 *
 * Every prompt names the real count and opens Ask My Vault with the question
 * already asked.
 */
function StudyPanel({ favorites }) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()

  const count = favorites.length
  const noun = count === 1 ? 'favorite' : 'favorites'

  // The topics are the user's own filing, so the prompt refers to things they
  // recognise rather than to "your favourites" in the abstract.
  const topics = [...new Set(favorites.map((item) => item.category).filter(Boolean))].slice(0, 3)

  const prompts = [
    {
      label: `Quiz me on my ${count} ${noun}`,
      Icon: GraduationCap,
      prompt: `Quiz me on the items I've starred${topics.length ? ` — they cover ${topics.join(', ')}` : ''}.`,
    },
    {
      label: 'What connects these?',
      Icon: Link2,
      prompt: `What themes connect the items I've starred as favorites?`,
    },
    {
      label: 'Build a revision session',
      Icon: Layers,
      prompt: `Build me a 20-minute revision session from my starred items.`,
    },
  ]

  return (
    <motion.aside
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 }}
      className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle"
    >
      <p className="flex items-center gap-1.5 text-caption font-semibold text-text-primary">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-light">
          <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        </span>
        Study from your favorites
      </p>

      <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
        These are the things you singled out. Ask My Vault can turn them into practice rather than just
        storage.
      </p>

      <ul className="-mx-1.5 mt-3 flex flex-col">
        {prompts.map(({ label, Icon, prompt }) => (
          <li key={label}>
            <button
              onClick={() => navigate('/chat', { state: { prompt } })}
              className="group/row flex w-full items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-caption text-text-primary">{label}</span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform duration-150 group-hover/row:translate-x-0.5"
                strokeWidth={2}
              />
            </button>
          </li>
        ))}
      </ul>
    </motion.aside>
  )
}

export default StudyPanel
