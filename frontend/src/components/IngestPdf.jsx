import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'
import Button from './Button.jsx'

function IngestPdf({ onSaved }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [generateSummary, setGenerateSummary] = useState(false)
  const [status, setStatus] = useState(null)

  const handleFile = (selectedFile) => {
    setFile(selectedFile)
    setStatus(null)
  }

  const handleSave = async () => {
    setStatus({ type: 'pending', message: 'Uploading and extracting text...' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('notes', notes)
      formData.append('generateSummary', generateSummary ? 'true' : 'false')

      const res = await fetch(`${API_URL}/api/items/pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save PDF')
      }

      setFile(null)
      setNotes('')
      setGenerateSummary(false)
      setStatus({ type: 'success', message: 'Saved.' })
      onSaved?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      {!file ? (
        <UploadField
          accept="application/pdf"
          description="Upload a PDF — text is extracted on the server before saving."
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

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border border-border-subtle p-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add your own notes about this PDF (optional)..."
          />

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={generateSummary}
              onChange={(e) => setGenerateSummary(e.target.checked)}
              className="h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary"
            />
            Generate AI summary for this PDF
          </label>

          <Button onClick={handleSave} className="self-start">
            Save
          </Button>
        </div>
      )}
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestPdf
