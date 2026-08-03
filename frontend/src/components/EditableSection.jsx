import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import Card from './Card.jsx'
import Button from './Button.jsx'

/**
 * A titled block of text that can be edited in place and saved.
 * Used for both the AI Summary and the user's own notes on an item.
 *
 * The empty state comes in two strengths. A section that's merely absent gets
 * `emptyLabel`, one line of grey. A section we actively want the user to fill
 * in — their own notes — gets the fuller `emptyTitle`/`emptyHelp`/`emptyCta`
 * treatment, because "No notes yet." states a fact and invites nothing.
 */
function EditableSection({
  label,
  value,
  placeholder,
  emptyLabel,
  onSave,
  emptyTitle,
  emptyHelp,
  emptyCta,
  EmptyIcon,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)

  // Re-sync when the item reloads (e.g. after save or navigating items).
  useEffect(() => {
    setDraft(value || '')
  }, [value])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const invites = !value && emptyTitle

  return (
    <Card className="mb-4 p-5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
        {/* The prompt is the whole empty state below, so a second "Add" in the
            corner would be two calls to action for one action. */}
        {!editing && !invites && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-caption text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
            {value ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex animate-fadeUp flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            placeholder={placeholder}
            className="resize-y rounded-xl bg-muted/50 p-3 text-body leading-relaxed text-text-primary transition-all duration-200 placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(value || '')
                setEditing(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : invites ? (
        <div className="flex flex-col items-start gap-1 rounded-xl bg-muted/40 px-3.5 py-3.5">
          <p className="flex items-center gap-2 text-body font-medium text-text-primary">
            {EmptyIcon && <EmptyIcon className="h-4 w-4 text-primary" strokeWidth={1.75} />}
            {emptyTitle}
          </p>
          {emptyHelp && <p className="text-caption leading-relaxed text-text-secondary">{emptyHelp}</p>}
          <button
            onClick={() => setEditing(true)}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-caption font-medium text-white transition-colors duration-150 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {emptyCta || 'Add'}
          </button>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-body leading-relaxed text-text-primary">
          {value || <span className="italic text-text-secondary">{emptyLabel}</span>}
        </p>
      )}
    </Card>
  )
}

export default EditableSection
