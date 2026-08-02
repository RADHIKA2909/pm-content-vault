import { useState } from 'react'
import { createWorker } from 'tesseract.js'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'
import Button from './Button.jsx'
import IngestOptions from './IngestOptions.jsx'

function IngestImage({ onSaved }) {
  const [file, setFile] = useState(null)
  const [notes, setNotes] = useState('')
  const [generateSummary, setGenerateSummary] = useState(false)
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState(null)

  const handleFile = (selectedFile) => {
    setFile(selectedFile)
    setStatus(null)
  }

  const handleSave = async () => {
    setStatus({ type: 'pending', message: 'Reading text from image...' })

    try {
      const worker = await createWorker('eng')
      const {
        data: { text },
      } = await worker.recognize(file)
      await worker.terminate()

      setStatus({ type: 'pending', message: 'Saving...' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('text', text)
      formData.append('notes', notes)
      formData.append('generateSummary', generateSummary ? 'true' : 'false')
      formData.append('categories', JSON.stringify(categories))

      const res = await fetch(`${API_URL}/api/items/image`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save item')

      setFile(null)
      setNotes('')
      setGenerateSummary(false)
      setCategories([])
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
          accept="image/*"
          description="Upload a WhatsApp-forwarded image or screenshot — text is extracted in your browser before saving."
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
            categories={categories}
            onCategoriesChange={setCategories}
            notesPlaceholder="Add your own notes about this image (optional)..."
            summaryLabel="Generate AI summary for this image"
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

export default IngestImage
