import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import Modal from '../Modal.jsx'

const CONFIRM_WORD = 'RESET'

/**
 * Deleting everything, with enough friction that it can't happen by accident.
 *
 * A plain confirm dialog is right for one item; this destroys the entire vault,
 * and one stray click on a page the user is only browsing would be
 * unrecoverable. Typing the word is the standard answer because it's the only
 * one a reflex can't get through.
 *
 * The counts are fetched rather than described in the abstract — "15 items and
 * 8 highlights" is a decision you can make, "all your data" isn't.
 */
function ResetVaultModal({ open, stats, onClose, onConfirm }) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTyped('')
      setBusy(false)
      // Focused after the modal paints, or the browser hands focus back to the
      // button that opened it.
      const timer = setTimeout(() => inputRef.current?.focus(), 60)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [open])

  const armed = typed.trim() === CONFIRM_WORD && !busy

  const run = async () => {
    if (!armed) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  const lines = [
    stats && `${stats.items} saved ${stats.items === 1 ? 'item' : 'items'}`,
    stats?.highlights ? `${stats.highlights} highlights and notes` : null,
    'every summary, embedding, tag and category',
  ].filter(Boolean)

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title="Reset vault">
      <div className="flex gap-3 rounded-xl bg-warning/10 p-3.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-primary">This cannot be undone</p>
          <p className="mt-1 text-caption leading-relaxed text-text-secondary">
            There is no backup and no undo. Everything below is deleted permanently.
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1.5">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-2 text-caption text-text-primary">
            <span className="h-1 w-1 shrink-0 rounded-full bg-warning" />
            {line}
          </li>
        ))}
      </ul>

      {/* Said out loud, because "Reset vault" sounds like it would take the
          conversations too, and being wrong about that in either direction is
          a bad surprise. */}
      <p className="mt-3 text-caption leading-relaxed text-text-secondary">
        Your Ask My Vault conversations are kept. They'll simply stop linking to the items that no longer
        exist.
      </p>

      <label className="mt-5 block">
        <span className="text-caption font-medium text-text-primary">
          Type <span className="font-semibold text-warning">{CONFIRM_WORD}</span> to confirm
        </span>
        <input
          ref={inputRef}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          disabled={busy}
          placeholder={CONFIRM_WORD}
          autoComplete="off"
          spellCheck={false}
          className="mt-1.5 w-full rounded-xl bg-muted/60 px-3 py-2 text-body text-text-primary transition-all duration-200 placeholder:text-text-secondary/60 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning"
        />
      </label>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={onClose}
          disabled={busy}
          className="rounded-xl px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={run}
          disabled={!armed}
          className="inline-flex items-center gap-2 rounded-xl bg-warning px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
          {busy ? 'Deleting…' : 'Reset vault'}
        </button>
      </div>
    </Modal>
  )
}

export default ResetVaultModal
