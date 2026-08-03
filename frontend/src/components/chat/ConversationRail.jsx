import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Plus, Search, Sparkles, Trash2 } from 'lucide-react'

// Grouped by when you last touched the conversation, not by exact date. You
// remember "the one from yesterday" long before you remember it was the 14th.
const GROUPS = [
  { key: 'today', label: 'Today', within: 1 },
  { key: 'yesterday', label: 'Yesterday', within: 2 },
  { key: 'week', label: 'Last week', within: 8 },
  { key: 'earlier', label: 'Earlier', within: Infinity },
]

const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

// Calendar days, not elapsed hours: a chat at 11pm last night is "Yesterday",
// however few hours ago that was. Both sides have to be floored to midnight —
// measuring from midnight-today to the timestamp itself put anything after
// ~midnight-minus-24h into "Today", so last night's conversations filed under
// the wrong heading.
const daysAgo = (iso) => Math.round((startOfDay(Date.now()) - startOfDay(iso)) / 86400000) + 1

function timeLabel(iso) {
  const days = daysAgo(iso)
  if (days <= 1) return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (days === 2) return 'Yesterday'
  if (days <= 8) return `${days - 1} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function ConversationRail({ sessions, activeId, onSelect, onNew, onDelete, loading }) {
  const [search, setSearch] = useState('')

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matching = q
      ? sessions.filter((s) => (s.title || '').toLowerCase().includes(q))
      : sessions

    return GROUPS.map((group, i) => {
      const floor = i === 0 ? 0 : GROUPS[i - 1].within
      return {
        ...group,
        sessions: matching.filter((s) => {
          const days = daysAgo(s.updated_at)
          return days > floor && days <= group.within
        }),
      }
    }).filter((g) => g.sessions.length)
  }, [sessions, search])

  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onNew}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-caption font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" strokeWidth={2} /> New chat
      </button>

      <div className="relative mt-2.5 shrink-0">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary"
          strokeWidth={1.75}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations"
          aria-label="Search conversations"
          className="w-full rounded-xl bg-muted/70 py-2 pl-8 pr-2.5 text-caption text-text-primary transition-all duration-200 placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="flex flex-col gap-1.5 px-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}

        {!loading && !sessions.length && (
          <p className="px-1.5 text-caption leading-relaxed text-text-secondary">
            Your past conversations will show up here, grouped by when you had them.
          </p>
        )}

        {!loading && sessions.length > 0 && !grouped.length && (
          <p className="px-1.5 text-caption text-text-secondary">No conversations match "{search}".</p>
        )}

        {grouped.map((group) => (
          <section key={group.key} className="mb-3">
            <h3 className="mb-1 px-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
              {group.label}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {group.sessions.map((s) => {
                const active = s.id === activeId
                return (
                  <li key={s.id}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 transition-colors duration-200 ${
                        active ? 'bg-primary text-white shadow-card' : 'hover:bg-muted'
                      }`}
                    >
                      <button
                        onClick={() => onSelect(s.id)}
                        className="flex min-w-0 flex-1 items-start gap-2 text-left focus:outline-none"
                      >
                        <MessageSquare
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            active ? 'text-white' : 'text-text-secondary'
                          }`}
                          strokeWidth={1.75}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-caption ${
                              active ? 'font-semibold text-white' : 'text-text-primary'
                            }`}
                          >
                            {s.title || 'Untitled chat'}
                          </span>
                          <span
                            className={`block text-[11px] ${
                              active ? 'text-white/75' : 'text-text-secondary'
                            }`}
                          >
                            {timeLabel(s.updated_at)}
                          </span>
                        </span>
                      </button>

                      <button
                        onClick={() => onDelete(s)}
                        aria-label="Delete conversation"
                        className={`shrink-0 rounded-lg p-1 opacity-0 transition-opacity duration-150 focus:opacity-100 focus:outline-none group-hover:opacity-100 ${
                          active ? 'text-white/80 hover:text-white' : 'text-text-secondary hover:text-warning'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </motion.div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Pinned to the bottom rather than floating after the list: the rail is
          usually half empty, and a tip that drifts up the column reads as the
          last conversation in the list. */}
      <div className="mt-3 shrink-0 rounded-2xl bg-primary-light/60 p-3">
        <p className="flex items-center gap-1.5 text-caption font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Pro tip
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">
          Ask a follow-up to connect ideas across saves — "how does this relate to what I saved about
          metrics?"
        </p>
      </div>
    </div>
  )
}

export default ConversationRail
