import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'

function IngestPdf() {
  const [status, setStatus] = useState(null)

  const handleFile = async (file) => {
    setStatus({ type: 'pending', message: 'Uploading and extracting text...' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/items/pdf`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save PDF')
      }

      setStatus({ type: 'success', message: 'Saved.' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      <UploadField
        accept="application/pdf"
        description="Upload a PDF — text is extracted on the server before saving."
        onFile={handleFile}
      />
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestPdf
