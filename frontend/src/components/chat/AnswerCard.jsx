import { motion, useReducedMotion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Columns2, CornerDownRight, Lightbulb, Sparkles } from 'lucide-react'
import UsedResourcesBadge from './UsedResourcesBadge.jsx'
import VaultExamples from './VaultExamples.jsx'

// The small caps label that opens each part of an answer. Every one names what
// the section *is* rather than describing its contents — "How they compare" is
// true of any comparison, where "Two approaches to sizing" would be a claim
// about the answer that nothing has checked.
function SectionLabel({ Icon, children }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
      <Icon className="h-3 w-3 text-primary" strokeWidth={2} />
      {children}
    </p>
  )
}

/**
 * One answer, composed of the sections the model returned.
 *
 * Every section is conditional, and that's the design rather than defensive
 * coding: the model is told to omit comparison cards unless the answer really
 * compares things, so an answer to "what did I save about RCA?" renders as an
 * overview and a body, with no empty "How they compare" heading over nothing.
 */
function AnswerCard({ message, onFollowUp, onOpenSources }) {
  const reduceMotion = useReducedMotion()
  const { sections, citations = [], context, error } = message

  if (error) {
    return <div className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">{message.text}</div>
  }

  const { overview, body, cards = [], takeaway, followUps = [] } = sections || {}

  const section = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.25, ease: 'easeOut', delay },
        }

  return (
    <motion.div
      {...section(0)}
      className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle sm:p-5"
    >
      {/* The assistant signs its answers. Without a name the reply reads as
          text that appeared, and the whole point of this page is that a
          specific thing — one that reads your vault — produced it. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
        <span className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary-light">
            <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.25} />
          </span>
          <span className="text-caption font-semibold text-text-primary">Vault AI</span>
        </span>

        <UsedResourcesBadge count={citations.length} breakdown={context?.breakdown} />
      </div>

      {/* The lead: a size up from the body, because it's what gets read on its
          own when the rest is skimmed. */}
      {overview && (
        <motion.p
          {...section(0.04)}
          className="text-[15px] font-medium leading-relaxed text-text-primary"
        >
          {overview}
        </motion.p>
      )}

      {body && (
        <motion.div
          {...section(0.08)}
          className={`prose prose-sm max-w-none text-text-primary prose-p:my-2 prose-p:leading-relaxed prose-strong:text-text-primary prose-ul:my-2 prose-li:my-1 prose-li:leading-relaxed ${
            overview ? 'mt-3' : ''
          }`}
        >
          <ReactMarkdown>{body}</ReactMarkdown>
        </motion.div>
      )}

      {/* Side by side, because the whole reason these are cards is that they're
          alternatives being weighed against each other. */}
      {cards.length > 0 && (
        <motion.section {...section(0.12)} className="mt-6">
          <SectionLabel Icon={Columns2}>How they compare</SectionLabel>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {cards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl bg-muted/50 p-3.5 transition-colors duration-200 hover:bg-muted"
              >
                <p className="text-caption font-semibold text-text-primary">{card.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
                  {card.description}
                </p>
                {card.highlight && (
                  <p className="mt-2.5 inline-block rounded-md bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
                    {card.highlight}
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {takeaway && (
        <motion.div {...section(0.16)} className="mt-6 flex gap-2.5 rounded-xl bg-warning/10 p-3.5">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-warning">
              Key takeaway
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-primary">{takeaway}</p>
          </div>
        </motion.div>
      )}

      <VaultExamples citations={citations} onOpenAll={onOpenSources} />

      {followUps.length > 0 && (
        <motion.section {...section(0.2)} className="mt-6 border-t border-border-subtle pt-4">
          <SectionLabel Icon={CornerDownRight}>Ask next</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {followUps.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={() => onFollowUp(prompt)}
                className="rounded-full bg-muted/70 px-3 py-1.5 text-caption font-medium text-text-primary transition-colors duration-150 hover:bg-primary-light hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  )
}

export default AnswerCard
