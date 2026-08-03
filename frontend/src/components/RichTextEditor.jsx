import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Bold, Highlighter, Image as ImageIcon, Italic, Link2, List, ListOrdered, Underline } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import Button from './Button.jsx'

const BARE_URL = /^https?:\/\/\S+$/i

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Shared contenteditable editor: formatting toolbar, pasted-image upload, and
 * link insertion. Used both for writing a new note and for reformatting an
 * item's saved content.
 *
 * Uncontrolled by design — React re-rendering a contenteditable on every
 * keystroke fights the browser's own caret handling. The parent reads the HTML
 * through the ref when it's ready to save.
 */
const RichTextEditor = forwardRef(function RichTextEditor(
  { initialHtml = '', placeholder = '', minHeight = 'min-h-[220px]', onStatus, allowImages = true },
  ref,
) {
  const [uploading, setUploading] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const editorRef = useRef(null)
  const fileInputRef = useRef(null)

  // Toolbar clicks and image uploads both steal focus from the editor, which
  // would drop the caret. The range is stashed first and restored before any
  // content is inserted.
  const savedRange = useRef(null)

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.innerHTML || '',
    getText: () => editorRef.current?.textContent || '',
    clear: () => {
      if (editorRef.current) editorRef.current.innerHTML = ''
      savedRange.current = null
    },
  }))

  // Seeding once on mount only: rewriting innerHTML while someone is typing
  // would wipe their caret position.
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Nearest enclosing <mark>, so highlighting can toggle rather than nest.
  const enclosingMark = (node) => {
    let current = node
    while (current && current !== editorRef.current) {
      if (current.nodeType === 1 && current.tagName === 'MARK') return current
      current = current.parentNode
    }
    return null
  }

  // execCommand's own highlight writes an inline background-color style, which
  // the server's sanitizer strips. <mark> is on its allowlist, so wrap in that.
  const highlight = () => {
    restoreSelection()
    const selection = window.getSelection()
    if (!selection?.rangeCount || selection.isCollapsed) return

    const range = selection.getRangeAt(0)

    // Already highlighted — unwrap it, keeping whatever formatting is inside.
    const existing = enclosingMark(range.commonAncestorContainer)
    if (existing) {
      const parent = existing.parentNode
      while (existing.firstChild) parent.insertBefore(existing.firstChild, existing)
      parent.removeChild(existing)
      savedRange.current = null
      return
    }

    // Wrapping the range directly, rather than replacing it via insertHTML.
    // insertHTML deletes the selection first, which destroys any <b>/<u>
    // wrapping it — highlighting bold text would strip the bold.
    const mark = document.createElement('mark')
    try {
      range.surroundContents(mark)
    } catch {
      // Thrown when the range only partly covers an element. extractContents
      // keeps the inner markup of what it takes, so the formatting survives.
      mark.appendChild(range.extractContents())
      range.insertNode(mark)
    }

    // Re-select the highlighted text so the next click can toggle it back off.
    const next = document.createRange()
    next.selectNodeContents(mark)
    selection.removeAllRanges()
    selection.addRange(next)
    saveSelection()
  }

  const uploadImage = async (file) => {
    setUploading(true)
    onStatus?.({ type: 'pending', message: 'Uploading image...' })

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_URL}/api/items/note/image`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Image upload failed')

      exec('insertHTML', `<img src="${escapeHtml(data.url)}" alt="" />`)
      onStatus?.(null)
    } catch (err) {
      onStatus?.({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = (e) => {
    saveSelection()

    const images = allowImages
      ? Array.from(e.clipboardData?.items || []).filter((item) => item.type.startsWith('image/'))
      : []

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
    if (!allowImages) return
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    e.preventDefault()
    saveSelection()
    files.forEach(uploadImage)
  }

  const addLink = () => {
    const url = linkUrl.trim()
    if (!BARE_URL.test(url)) {
      onStatus?.({ type: 'error', message: 'Enter a full URL starting with http:// or https://' })
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
    onStatus?.(null)
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
    <div className="overflow-hidden rounded-xl border border-border-subtle focus-within:ring-2 focus-within:ring-primary">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border-subtle bg-muted px-2 py-1.5">
        {toolbarButton('bold', Bold, 'Bold', () => exec('bold'))}
        {toolbarButton('italic', Italic, 'Italic', () => exec('italic'))}
        {toolbarButton('underline', Underline, 'Underline', () => exec('underline'))}
        {toolbarButton('highlight', Highlighter, 'Highlight', highlight)}
        {toolbarButton('ul', List, 'Bullet list', () => exec('insertUnorderedList'))}
        {toolbarButton('ol', ListOrdered, 'Numbered list', () => exec('insertOrderedList'))}
        {toolbarButton('link', Link2, 'Add link', () => {
          saveSelection()
          setLinkOpen((v) => !v)
        })}
        {allowImages &&
          toolbarButton('image', ImageIcon, 'Insert image', () => {
            saveSelection()
            fileInputRef.current?.click()
          })}

        {allowImages && (
          <span className="ml-auto pr-1 text-[11px] text-text-secondary">
            {uploading ? 'Uploading...' : 'Paste screenshots straight in'}
          </span>
        )}
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
        data-placeholder={placeholder}
        className={`note-editor ${minHeight} max-h-[45vh] overflow-y-auto bg-surface p-3 text-sm text-text-primary focus:outline-none`}
      />

      {allowImages && (
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
      )}
    </div>
  )
})

export default RichTextEditor
