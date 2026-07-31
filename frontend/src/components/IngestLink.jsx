import { useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import Button from './Button.jsx'

function IngestLink({ onSaved }) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus({ type: 'pending', message: 'Fetching page...' })

    try {
      const res = await fetch(`${API_URL}/api/items/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save link')
      }

      setUrl('')
      setStatus({ type: 'success', message: 'Saved.' })
      onSaved?.()
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-xl border border-border-subtle px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="https://..."
          required
        />
        <Button type="submit" className="whitespace-nowrap">
          Fetch &amp; Save
        </Button>
      </form>
      <StatusMessage status={status} />
    </div>
  )
}

export default IngestLink
