import { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react'
import Card from './Card.jsx'
import Button from './Button.jsx'

// A titled block of text that can be edited in place and saved.
// Used for both the AI Summary and the user's own notes on an item.
function EditableSection({ label, value, placeholder, emptyLabel, onSave }) {
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

  return (
    <Card className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">{label}</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-caption text-text-secondary transition-colors hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
            {value ? 'Edit' : 'Add'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            autoFocus
            placeholder={placeholder}
            className="resize-none rounded-xl border border-border-subtle p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
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
      ) : (
        <p className="whitespace-pre-wrap text-body text-text-primary">
          {value || <span className="italic text-text-secondary">{emptyLabel}</span>}
        </p>
      )}
    </Card>
  )
}

export default EditableSection
