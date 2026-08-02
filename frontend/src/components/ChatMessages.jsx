import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ChevronDown } from 'lucide-react'
import { CategoryChip } from './Chip.jsx'

// Shared by Ask My Vault and the per-item chat panel so both render answers
// and their sources identically.

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-border-subtle"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  )
}

export function Sources({ citations }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!citations?.length) return null

  return (
    <div className="mt-2 border-t border-border-subtle pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-caption font-medium text-text-secondary hover:text-text-primary"
      >
        Sources ({citations.length}){' '}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5">
          {citations.map((c) => (
            <button
              key={c.index}
              onClick={() => c.item?.id && navigate(`/library/${c.item.id}`)}
              className="flex items-start gap-2 rounded-xl bg-muted px-2.5 py-2 text-left transition-colors hover:bg-primary-light"
            >
              <span className="mt-0.5 shrink-0 rounded bg-surface px-1.5 py-0.5 text-caption font-medium text-text-secondary">
                {c.index}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryChip category={c.item?.category} />
                <span className="text-caption text-text-secondary">
                  {c.item?.summary || c.chunk_text?.slice(0, 90)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function MessageBubble({ message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-white">
          {message.text}
        </p>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm ${
          message.error ? 'bg-warning/10 text-warning' : 'border border-border-subtle bg-surface'
        }`}
      >
        <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>
        <Sources citations={message.citations} />
      </div>
    </div>
  )
}
