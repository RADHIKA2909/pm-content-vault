import { ArrowRight, MessageSquare, Sparkles } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

function relativeDay(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * The "where did I leave off" answer. Shows the two most recent questions and
 * deep-links each back into its own conversation.
 */
function ContinueLearning({ history, onOpenSession, onViewAll, delay = 0 }) {
  const recent = history.slice(0, 2)

  return (
    <SectionCard
      icon={MessageSquare}
      title="Continue Learning"
      subtitle="Pick up where you left off in your last conversations."
      delay={delay}
      action={
        history.length > 0 ? (
          <button onClick={onViewAll} className="shrink-0 text-caption font-medium text-primary hover:underline">
            View all
          </button>
        ) : null
      }
    >
      {recent.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-8 text-center">
          <Sparkles className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
          <p className="text-sm text-text-primary">No conversations yet</p>
          <p className="text-caption text-text-secondary">Ask your vault a question to get started.</p>
          <button onClick={onViewAll} className="mt-1 text-caption font-medium text-primary hover:underline">
            Ask My Vault
          </button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {recent.map((q) => (
              <li key={q.id}>
                <button
                  onClick={() => onOpenSession(q.session_id)}
                  className="group flex w-full items-center gap-3.5 rounded-xl bg-muted/50 px-3.5 py-3.5 text-left ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-card-hover hover:ring-border-subtle/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary transition-transform duration-200 group-hover:scale-105">
                    <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-primary">{q.query_text}</span>
                    <span className="mt-0.5 block text-caption text-text-secondary">
                      You asked · {relativeDay(q.created_at)}
                    </span>
                  </span>

                  <span className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-caption font-medium text-text-primary shadow-raised ring-1 ring-border-subtle/70 transition-all duration-200 group-hover:bg-primary group-hover:text-white group-hover:ring-primary sm:inline-flex">
                    Continue <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

        </>
      )}
    </SectionCard>
  )
}

export default ContinueLearning
