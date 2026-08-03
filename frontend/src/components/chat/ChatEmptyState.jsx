import { motion, useReducedMotion } from 'framer-motion'
import { FolderTree, GraduationCap, Lightbulb, Link2 } from 'lucide-react'
import VaultConstellation from '../decorations/VaultConstellation.jsx'

// Four openers that each demonstrate something different the assistant can do:
// survey the collection, practise, explain, and find connections. A row of
// four variations on "summarise this" would teach the user nothing.
const QUICK_ACTIONS = [
  {
    label: 'What topics have I saved?',
    hint: 'A tour of your collection',
    Icon: FolderTree,
    prompt: 'What topics are saved in my vault?',
  },
  {
    label: 'Quiz me',
    hint: 'Practice from your own saves',
    Icon: GraduationCap,
    prompt: 'Quiz me on something I have saved.',
  },
  {
    label: 'Explain product sense',
    hint: 'Grounded in what you saved',
    Icon: Lightbulb,
    prompt: 'Explain product sense using what I have saved.',
  },
  {
    label: 'Find related notes',
    hint: 'Connect ideas across saves',
    Icon: Link2,
    prompt: 'Which of my saved notes are related to each other?',
  },
]

function ChatEmptyState({ onAsk, stats }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        <VaultConstellation />
      </motion.div>

      <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-text-primary">Ask My Vault</h2>
      <p className="mt-1.5 max-w-sm text-center text-body leading-relaxed text-text-secondary">
        Search across everything you've saved
        {/* Only stated once the count is in. "across 0 items" while the request
            is still in flight reads as an empty vault. */}
        {stats?.items ? ` — ${stats.items} items and counting` : ''}. Answers cite the saves they came
        from.
      </p>

      <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {QUICK_ACTIONS.map(({ label, hint, Icon, prompt }, i) => (
          <motion.button
            key={label}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut', delay: 0.06 + i * 0.04 }}
            whileHover={reduceMotion ? undefined : { y: -2 }}
            onClick={() => onAsk(prompt)}
            className="flex items-start gap-2.5 rounded-2xl bg-surface p-3 text-left shadow-card ring-1 ring-border-subtle transition-shadow duration-200 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-light">
              <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-caption font-medium text-text-primary">{label}</span>
              <span className="block text-[11px] text-text-secondary">{hint}</span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export default ChatEmptyState
