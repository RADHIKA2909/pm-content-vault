import { useRef, useState } from 'react'
import { Bold, Image as ImageIcon, Italic, Link2, List, ListOrdered } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import StatusMessage from './StatusMessage.jsx'
import IngestOptions from './IngestOptions.jsx'
import Button from './Button.jsx'

const BARE_URL = /^https?:\/\/\S+$/i

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// A freeform notepad: type, paste screenshots, drop in links — all in one body.
// Uses contenteditable rather than a rich-text library to avoid pulling a large
// dependency in for what is essentially a scratchpad. The HTML it produces is
// sanitised server-side before it's ever stored or displayed.
function IngestNote({ onSaved }) {
  const [generateSummary, setGenerateSummary] = useState(false)
  const [categories, setCategories] = useState([])
  const [status, setStatus] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  // Toolbar clicks and image uploads both steal focus from the editor, which
  // would drop the caret. The range is stashed first and restored before any
  // content is inserted.
  const savedRange = useRef(null)

  const saveSelection = () => {
    const selection = window.getSelection()
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      savedRange.current = selection.getRangeAt(0)
    }
  }

  const restoreSelection = () => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (savedRange.current) {
      selection.removeAllRanges()
      selection.addRange(savedRange.current)
    }
  }

  const exec = (command, value = null) => {
    restoreSelection()
    document.execCommand(command, false, value)
    saveSelection()
  }

  const uploadImage = async (file) => {
    setUploading(true)
    setStatus({ type: 'pending', message: 'Uploading image...' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/items/note/image`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image upload failed')

      exec('insertHTML', `<img src="${escapeHtml(data.url)}" alt="" />`)
      setStatus(null)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = (e) => {
    saveSelection()

    const clipboardItems = Array.from(e.clipboardData?.items || [])
    const images = clipboardItems.filter((item) => item.type.startsWith('image/'))

    if (images.length) {
      e.preventDefault()
      images.forEach((item) => {
        const file = item.getAsFile()
        if (file) uploadImage(file)
      })
      return
    }

    // A pasted bare URL becomes a real link instead of dead text.
    const text = e.clipboardData?.getData('text/plain')?.trim()
    const html = e.clipboardData?.getData('text/html')
    if (!html && text && BARE_URL.test(text)) {
      e.preventDefault()
      const safe = escapeHtml(text)
      exec('insertHTML', `<a href="${safe}">${safe}</a>&nbsp;`)
    }
  }

  const handleDrop = (e) => {
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    e.preventDefault()
    saveSelection()
    files.forEach(uploadImage)
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!BARE_URL.test(url)) {
      setStatus({ type: 'error', message: 'Enter a full URL starting with http:// or https://' })
      return
    }

    restoreSelection()
    const selection = window.getSelection()
    const safe = escapeHtml(url)

    // Wrap the highlighted words if there are any, otherwise drop the URL in.
    if (selection && !selection.isCollapsed) {
      document.execCommand('createLink', false, url)
    } else {
      document.execCommand('insertHTML', false, `<a href="${safe}">${safe}</a>&nbsp;`)
    }

    saveSelection()
    setLinkUrl('')
    setLinkOpen(false)
    setStatus(null)
  }

  const save = async () => {
    const html = editorRef.current?.innerHTML || ''

    if (!editorRef.current?.textContent?.trim() && !html.includes('<img')) {
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

      editorRef.current.innerHTML = ''
      savedRange.current = null
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

  const toolbarButton = (key, Icon, label, onClick) => (
    <button
      key={key}
      type="button"
      aria-label={label}
      title={label}
      // Keeps the caret in the editor when the button takes the click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
    >
      <Icon className="h-4 w-4" />
    </button>
  )

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-xl border border-border-subtle focus-within:ring-2 focus-within:ring-primary">
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle bg-muted px-2 py-1.5">
            {toolbarButton('bold', Bold, 'Bold', () => exec('bold'))}
            {toolbarButton('italic', Italic, 'Italic', () => exec('italic'))}
            {toolbarButton('ul', List, 'Bullet list', () => exec('insertUnorderedList'))}
            {toolbarButton('ol', ListOrdered, 'Numbered list', () => exec('insertOrderedList'))}
            {toolbarButton('link', Link2, 'Add link', () => {
              saveSelection()
              setLinkOpen((v) => !v)
            })}
            {toolbarButton('image', ImageIcon, 'Insert image', () => {
              saveSelection()
              fileInputRef.current?.click()
            })}

            <span className="ml-auto pr-1 text-[11px] text-text-secondary">
              {uploading ? 'Uploading...' : 'Paste screenshots straight in'}
            </span>
          </div>

          {linkOpen && (
            <div className="flex items-center gap-2 border-b border-border-subtle bg-surface px-2 py-2">
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())}
                autoFocus
                placeholder="https://..."
                className="flex-1 rounded-lg border border-border-subtle px-2.5 py-1.5 text-caption focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button onClick={addLink}>Add</Button>
            </div>
          )}

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            data-placeholder="Type anything — paste screenshots, drop in links, jot down what you learned..."
            className="note-editor min-h-[220px] max-h-[45vh] overflow-y-auto bg-surface p-3 text-sm text-text-primary focus:outline-none"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadImage(file)
            e.target.value = ''
          }}
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

        <Button onClick={save} disabled={uploading} className="self-start">
          Save
        </Button>
      </div>

      <StatusMessage status={status} />
    </div>
  )
}

export default IngestNote
