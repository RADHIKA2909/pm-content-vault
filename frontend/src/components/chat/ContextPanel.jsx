import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ChevronRight,
  FileText,
  FolderTree,
  GraduationCap,
  Highlighter,
  Layers,
  Lightbulb,
  Link2,
  NotebookPen,
  Sparkles,
  Waypoints,
} from 'lucide-react'

const STAT_TILES = [
  { key: 'items', label: 'Saved items', Icon: Layers, tone: 'bg-primary-light text-primary' },
  { key: 'notes', label: 'Notes', Icon: NotebookPen, tone: 'bg-success/10 text-success' },
  { key: 'highlights', label: 'Highlights', Icon: Highlighter, tone: 'bg-accent-light text-accent' },
  { key: 'categories', label: 'Categories', Icon: FolderTree, tone: 'bg-secondary/10 text-secondary' },
]

// Each row sends a real question. They're shortcuts to things worth asking
// next, not links to features that don't exist.
const CONTINUE = [
  { label: 'Quiz me on this', Icon: GraduationCap, prompt: 'Quiz me on what we just covered.' },
  {
    label: 'Create flashcards',
    Icon: Layers,
    prompt: 'Turn this into flashcards — Q on one line, A on the next.',
  },
  {
    label: 'More practice questions',
    Icon: FileText,
    prompt: 'Give me more practice questions on this topic.',
  },
  { label: 'Explain with an example', Icon: Lightbulb, prompt: 'Explain that with a concrete example.' },
  {
    label: 'Related frameworks',
    Icon: Link2,
    prompt: 'What related frameworks should I know alongside this?',
  },
]

function Panel({ title, Icon, children }) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
      <h3 className="mb-3 flex items-center gap-1.5 text-caption font-semibold text-text-primary">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />}
        {title}
      </h3>
      {children}
    </section>
  )
}

/**
 * The right rail: what's in the vault, what this answer drew on, and where to
 * go next.
 *
 * "Context in this answer" only appears once there is an answer — before that
 * it would be four zeros claiming to describe something that hasn't happened.
 */
function ContextPanel({ stats, context, connectedIdeas = [], onAsk, onOpenSources, hasAnswer }) {
  const reduceMotion = useReducedMotion()

  return (
    <div className="flex flex-col gap-3">
      <Panel title="Your vault at a glance" Icon={Sparkles}>
        <div className="grid grid-cols-2 gap-2">
          {STAT_TILES.map(({ key, label, Icon, tone }) => (
            <div key={key} className="rounded-xl bg-muted/40 p-2.5">
              <span className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <p className="text-[18px] font-semibold leading-none tabular-nums text-text-primary">
                {stats ? stats[key] : '—'}
              </p>
              <p className="mt-1 text-[11px] text-text-secondary">{label}</p>
            </div>
          ))}
        </div>
      </Panel>

      {hasAnswer && context && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Panel title="Context in this answer" Icon={Waypoints}>
            <dl className="flex flex-col gap-2">
              {[
                ['Notes', context.notes, NotebookPen],
                ['Documents', context.documents, FileText],
                // Precise on purpose. Annotations are not retrievable sources —
                // the answer never read them — so this says where they live
                // rather than implying they were used.
                ['Highlights on these sources', context.highlights, Highlighter],
              ].map(([label, value, Icon]) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                  <dt className="min-w-0 flex-1 text-caption text-text-secondary">{label}</dt>
                  <dd className="text-caption font-semibold tabular-nums text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>

            <button
              onClick={onOpenSources}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-light py-2 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              View all sources <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </Panel>
        </motion.div>
      )}

      {connectedIdeas.length > 0 && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut', delay: 0.05 }}
        >
          <Panel title="Connected ideas" Icon={Waypoints}>
            {/* Drawn from how the user already filed the cited items — their
                own categories and tags, not the model's guess at what's
                related. */}
            <div className="flex flex-wrap gap-1.5">
              {connectedIdeas.map((idea) => (
                <button
                  key={idea}
                  onClick={() => onAsk(`How does ${idea} connect to what I just asked about?`)}
                  className="rounded-full bg-muted/70 px-2.5 py-1 text-[12px] font-medium text-text-primary transition-colors duration-150 hover:bg-primary-light hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {idea}
                </button>
              ))}
            </div>
          </Panel>
        </motion.div>
      )}

      <Panel title="Continue learning" Icon={GraduationCap}>
        <ul className="-mx-1.5 flex flex-col">
          {CONTINUE.map(({ label, Icon, prompt }) => (
            <li key={label}>
              <button
                onClick={() => onAsk(prompt)}
                className="group/row flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors duration-150 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate text-caption text-text-primary">{label}</span>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform duration-150 group-hover/row:translate-x-0.5"
                  strokeWidth={2}
                />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

export default ContextPanel
