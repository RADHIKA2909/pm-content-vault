import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import UploadField from './UploadField.jsx'

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function IngestWhatsapp() {
  const [status, setStatus] = useState(null)

  const handleFile = async (file) => {
    setStatus({ type: 'pending', message: 'Parsing export...' })

    try {
      const text = await readFileAsText(file)

      const res = await fetch(`${API_URL}/api/items/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save export')
      }

      const { count } = await res.json()
      setStatus({ type: 'success', message: `Saved ${count} messages.` })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      <UploadField
        accept=".txt"
        description="Upload the .txt file from WhatsApp's Export Chat feature — each message becomes a separate item."
        onFile={handleFile}
      />
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestWhatsapp
