import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'
import Button from './Button.jsx'
import IngestOptions from './IngestOptions.jsx'

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function IngestWhatsapp({ onSaved }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [generateSummary, setGenerateSummary] = useState(false)
  const [status, setStatus] = useState(null)

  const handleFile = (selectedFile) => {
    setFile(selectedFile)
    setStatus(null)
  }

  const handleSave = async () => {
    setStatus({ type: 'pending', message: 'Parsing export...' })

    try {
      const text = await readFileAsText(file)

      const res = await fetch(`${API_URL}/api/items/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          notes,
          generateSummary: generateSummary ? 'true' : 'false',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save export')
      }

      const { count } = await res.json()
      setFile(null)
      setNotes('')
      setGenerateSummary(false)
      setStatus({ type: 'success', message: `Saved ${count} messages.` })
      onSaved?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      {!file ? (
        <UploadField
          accept=".txt"
          description="Upload the .txt file from WhatsApp's Export Chat feature — each message becomes a separate item."
          onFile={handleFile}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-muted p-3 text-sm text-text-primary">
            <span className="truncate">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="ml-auto shrink-0 text-caption text-text-secondary hover:text-warning"
            >
              Remove
            </button>
          </div>

          <IngestOptions
            notes={notes}
            onNotesChange={setNotes}
            generateSummary={generateSummary}
            onGenerateSummaryChange={setGenerateSummary}
            notesPlaceholder="Add a note about this chat export (applies to every message)..."
            summaryLabel="Generate AI summary for every message in this export"
          />

          <Button onClick={handleSave} className="self-start">
            Save
          </Button>
        </div>
      )}
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestWhatsapp
