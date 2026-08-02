import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import { renderPdfFirstPage } from '../lib/pdfThumbnail.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'
import Button from './Button.jsx'
import IngestOptions from './IngestOptions.jsx'

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
    setStatus({ type: 'pending', message: 'Rendering preview...' })

    try {
      // Best-effort: a PDF that won't render still saves, just without a
      // card preview.
      const thumbnail = await renderPdfFirstPage(file)

      setStatus({ type: 'pending', message: 'Uploading and extracting text...' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('notes', notes)
      formData.append('generateSummary', generateSummary ? 'true' : 'false')
      if (thumbnail) formData.append('thumbnail', thumbnail, 'page1.png')

      const res = await fetch(`${API_URL}/api/items/pdf`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save PDF')

      setFile(null)
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

          <IngestOptions
            notes={notes}
            onNotesChange={setNotes}
            generateSummary={generateSummary}
            onGenerateSummaryChange={setGenerateSummary}
            notesPlaceholder="Add your own notes about this PDF (optional)..."
            summaryLabel="Generate AI summary for this PDF"
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

export default IngestPdf
