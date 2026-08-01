import { useState } from 'react'
import { createWorker } from 'tesseract.js'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'

function IngestImage({ onSaved }) {
  const [status, setStatus] = useState(null)

  const handleFile = async (file) => {
    setStatus({ type: 'pending', message: 'Reading text from image...' })

    try {
      const worker = await createWorker('eng')
      const {
        data: { text },
      } = await worker.recognize(file)
      await worker.terminate()

      if (!text.trim()) {
        setStatus({ type: 'error', message: 'No text found in that image.' })
        return
      }

      setStatus({ type: 'pending', message: 'Saving...' })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('text', text)

      const res = await fetch(`${API_URL}/api/items/image`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save item')
      }

      setStatus({ type: 'success', message: 'Saved.' })
      onSaved?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      <UploadField
        accept="image/*"
        description="Upload a WhatsApp-forwarded image or screenshot — text is extracted in your browser before saving."
        onFile={handleFile}
      />
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestImage
