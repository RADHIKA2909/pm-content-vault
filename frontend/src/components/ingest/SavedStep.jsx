import { ArrowRight, Check, MessageSquare, Plus, Sparkles, SquareArrowOutUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import SourceThumbnail from '../SourceThumbnail.jsx'
import SourceBadge from '../SourceBadge.jsx'
import { CategoryChip } from '../Chip.jsx'
import { parseTitle } from '../../lib/parseTitle.js'

function SavedStep({ item, categories, onOpen, onAsk, onAddAnother, onDone }) {
  const reduceMotion = useReducedMotion()
  const { title, subtitle } = parseTitle(item.title)

  const actions = [
    { key: 'open', label: 'Open item', hint: 'See what was saved', Icon: SquareArrowOutUpRight, run: onOpen },
    { key: 'ask', label: 'Ask My Vault', hint: 'Ask questions about it', Icon: MessageSquare, run: onAsk },
    { key: 'add', label: 'Add another', hint: 'Keep going', Icon: Plus, run: onAddAnother },
  ]

  return (
    <div className="flex flex-col items-center py-2">
      {/* Overshoot once and settle, with two sparks that fade as they drift.
          Enough to register as a small reward; not enough to sit through. */}
      <span className="relative flex h-14 w-14 items-center justify-center">
        {!reduceMotion && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-success/20"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute -right-1 -top-1 text-warning"
              initial={{ scale: 0, opacity: 0, rotate: -20 }}
              animate={{ scale: [0, 1, 0.9], opacity: [0, 1, 0], y: -8 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.15 }}
            >
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            </motion.span>
            <motion.span
              aria-hidden="true"
              className="absolute -bottom-1 -left-1 text-primary"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 0.9, 0.8], opacity: [0, 1, 0], y: 6 }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            >
              <Sparkles className="h-3 w-3" strokeWidth={2.25} />
            </motion.span>
          </>
        )}
        <motion.span
          initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.32, ease: [0.34, 1.4, 0.64, 1] }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-success/12 text-success"
        >
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </motion.span>
      </span>

      <h3 className="mt-3.5 text-[19px] font-semibold tracking-tight text-text-primary">
        Added to your PM Content Vault
      </h3>
      <p className="mt-1 text-body text-text-secondary">It's searchable in Ask My Vault straight away.</p>

      <div className="mt-5 flex w-full max-w-md gap-3 rounded-2xl bg-surface p-3 shadow-raised ring-1 ring-border-subtle">
        <div className="h-[62px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <SourceThumbnail item={item} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{title || 'Untitled'}</p>
          {subtitle && <p className="truncate text-caption text-text-secondary">{subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
            {categories.map((category) => (
              <CategoryChip key={category} category={category} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 w-full max-w-md space-y-1.5">
        {actions.map(({ key, label, hint, Icon, run }) => (
          <button
            key={key}
            onClick={run}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-border-subtle transition-all duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-primary">{label}</span>
              <span className="block text-caption text-text-secondary">{hint}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-text-primary" />
          </button>
        ))}
      </div>

      <button
        onClick={onDone}
        className="mt-4 rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        Done
      </button>
    </div>
  )
}

export default SavedStep
