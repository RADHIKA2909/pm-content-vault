import { useRef, useState } from 'react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import IngestOptions from './IngestOptions.jsx'
import RichTextEditor from './RichTextEditor.jsx'
import Button from './Button.jsx'

// A freeform notepad: type, paste screenshots, drop in links — all in one body.
// The editor itself is shared with the item-content editor; the HTML it
// produces is sanitised server-side before it's ever stored or displayed.
function IngestNote({ onSaved }) {
  const [generateSummary, setGenerateSummary] = useState(false)
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState(null)
  const editorRef = useRef(null)

  const save = async () => {
    const html = editorRef.current?.getHtml() || ''

    if (!editorRef.current?.getText()?.trim() && !html.includes('<img')) {
      setStatus({ type: 'error', message: 'Write something, or paste an image, before saving' })
      return
    }

    setStatus({ type: 'pending', message: 'Saving...' })

    try {
      const res = await fetch(`${API_URL}/api/items/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, generateSummary: generateSummary ? 'true' : 'false', categories }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save note')

      editorRef.current.clear()
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
      <div className="flex flex-col gap-3">
        <RichTextEditor
          ref={editorRef}
          onStatus={setStatus}
          placeholder="Type anything — paste screenshots, drop in links, jot down what you learned..."
        />

        {/* No notes field here — the body above already is the note. */}
        <IngestOptions
          generateSummary={generateSummary}
          onGenerateSummaryChange={setGenerateSummary}
          categories={categories}
          onCategoriesChange={setCategories}
          summaryLabel="Generate AI summary for this note"
          showNotes={false}
        />

        <Button onClick={save} className="self-start">
          Save
        </Button>
      </div>

      <StatusMessage status={status} />
    </div>
  )
}

export default IngestNote
