import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import Button from './Button.jsx'
import IngestOptions from './IngestOptions.jsx'

const LINK_TYPES = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'blog', label: 'Blog / Post' },
  { value: 'other', label: 'Other' },
]

function IngestLink({ onSaved }) {
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [linkType, setLinkType] = useState('linkedin')
  const [generateSummary, setGenerateSummary] = useState(false)
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState(null)
  // Set when the backend couldn't read the page — offers the user a choice
  // between saving the bare link or pasting the content in themselves.
  const [fetchFailure, setFetchFailure] = useState(null)
  const [manualContent, setManualContent] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

  const reset = () => {
    setUrl('')
    setNotes('')
    setGenerateSummary(false)
    setCategories([])
    setFetchFailure(null)
    setManualContent('')
    setShowManualInput(false)
  }

  const save = async (extraFields = {}) => {
    setStatus({ type: 'pending', message: 'Saving...' })

    try {
      const res = await fetch(`${API_URL}/api/items/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          notes,
          linkType,
          generateSummary: generateSummary ? 'true' : 'false',
          categories,
          ...extraFields,
        }),
      })

      const data = await res.json()

      if (res.status === 422 && data.fetchFailed) {
        setFetchFailure(data.reason)
        setStatus(null)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Failed to save link')

      reset()
      setStatus(
        data.warning
          ? { type: 'error', message: data.warning }
          : { type: 'success', message: 'Saved.' },
      )
      onSaved?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFetchFailure(null)
    setStatus({ type: 'pending', message: 'Fetching page...' })
    save()
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="rounded-xl border border-border-subtle px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://..."
          required
        />

        <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
          {LINK_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setLinkType(type.value)}
              className={`rounded-full px-3.5 py-1.5 text-caption transition-colors ${
                linkType === type.value
                  ? 'bg-surface font-medium text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <IngestOptions
          notes={notes}
          onNotesChange={setNotes}
          generateSummary={generateSummary}
          onGenerateSummaryChange={setGenerateSummary}
          categories={categories}
          onCategoriesChange={setCategories}
          notesPlaceholder="Add your own notes about this link (optional)..."
          summaryLabel="Generate AI summary for this link"
        />

        {!fetchFailure && (
          <Button type="submit" className="self-start whitespace-nowrap">
            Fetch &amp; Save
          </Button>
        )}
      </form>

      {fetchFailure && (
        <div className="mt-3 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">
                Couldn't read this page — {fetchFailure}.
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                You can still save it. Pick one:
              </p>

              {!showManualInput ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => save({ skipFetch: true })}>
                    Just save the link
                  </Button>
                  <Button variant="ghost" onClick={() => setShowManualInput(true)}>
                    Paste the content myself
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <textarea
                    value={manualContent}
                    onChange={(e) => setManualContent(e.target.value)}
                    rows={6}
                    autoFocus
                    className="resize-none rounded-xl border border-border-subtle p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Paste the post content here..."
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => save({ manualContent })}
                      disabled={!manualContent.trim()}
                    >
                      Save with this content
                    </Button>
                    <Button variant="ghost" onClick={() => setShowManualInput(false)}>
                      Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <StatusMessage status={status} />
    </div>
  )
}

export default IngestLink
