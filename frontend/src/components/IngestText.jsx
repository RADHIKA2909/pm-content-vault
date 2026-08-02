import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import Button from './Button.jsx'
import IngestOptions from './IngestOptions.jsx'

function IngestText({ onSaved }) {
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [generateSummary, setGenerateSummary] = useState(false)
  const [status, setStatus] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ type: 'pending', message: 'Saving...' })

    try {
      const res = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          notes,
          generateSummary: generateSummary ? 'true' : 'false',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save item')

      setText('')
      setNotes('')
      setGenerateSummary(false)
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

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="resize-none rounded-xl border border-border-subtle p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Paste PM-prep content here..."
          required
        />

        <IngestOptions
          notes={notes}
          onNotesChange={setNotes}
          generateSummary={generateSummary}
          onGenerateSummaryChange={setGenerateSummary}
          notesPlaceholder="Add your own notes about this (optional)..."
          summaryLabel="Generate AI summary for this text"
        />

        <Button type="submit" className="self-start">
          Save
        </Button>
      </form>
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestText
