import { MessageSquare, Plus, Trash2 } from 'lucide-react'

function relativeDate(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function ChatHistoryPanel({ sessions, activeId, onSelect, onNew, onDelete, loading }) {
  return (
    <div className="flex h-full flex-col">
      <button
        onClick={onNew}
        className="mb-3 flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-caption font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-3.5 w-3.5" /> New chat
      </button>

      <p className="mb-2 shrink-0 px-1 text-caption font-medium text-text-secondary">History</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && <p className="px-1 text-caption text-text-secondary">Loading...</p>}

        {!loading && sessions.length === 0 && (
          <p className="px-1 text-caption text-text-secondary">
            Your past conversations will show up here.
          </p>
        )}

        <ul className="flex flex-col gap-0.5">
          {sessions.map((s) => (
            <li key={s.id}>
              <div
                className={`group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${
                  s.id === activeId ? 'bg-primary-light' : 'hover:bg-muted'
                }`}
              >
                <button
                  onClick={() => onSelect(s.id)}
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                >
                  <MessageSquare
                    className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                      s.id === activeId ? 'text-primary' : 'text-text-secondary'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-caption ${
                        s.id === activeId ? 'font-medium text-primary' : 'text-text-primary'
                      }`}
                    >
                      {s.title || 'Untitled chat'}
                    </span>
                    <span className="block text-[11px] text-text-secondary">
                      {relativeDate(s.updated_at)}
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => onDelete(s)}
                  aria-label="Delete conversation"
                  className="shrink-0 rounded-lg p-1 text-text-secondary opacity-0 transition-opacity hover:text-warning focus:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default ChatHistoryPanel
