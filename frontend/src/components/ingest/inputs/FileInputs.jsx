import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FileText, Loader2, X } from 'lucide-react'
import UploadField from '../../UploadField.jsx'
import { fetchLinkPreview } from '../../../lib/composeApi.js'
import { Panel, Field, inputClass } from './SimpleInputs.jsx'

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Link ────────────────────────────────────────────────────────────────
// The preview is fetched as you finish typing so you can confirm the page is
// the one you meant before spending an AI call on it.
export function LinkInput({ value, onChange, notes, onNotesChange, preview, onPreview }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const lastFetched = useRef('')

  useEffect(() => {
    const url = value.trim()
    if (!/^https?:\/\/\S+\.\S+/i.test(url) || url === lastFetched.current) return

    const timer = setTimeout(async () => {
      lastFetched.current = url
      setState('loading')
      setError(null)
      try {
        onPreview(await fetchLinkPreview(url))
        setState('done')
      } catch (err) {
        onPreview(null)
        setError(err.message)
        setState('error')
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [value, onPreview])

  return (
    <Panel title="Paste a link" hint="We'll read the page so you don't have to.">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="url"
        autoFocus
        placeholder="https://www.lennysnewsletter.com/p/..."
        className={inputClass}
      />

      {state === 'loading' && (
        <p className="mt-2.5 flex items-center gap-2 text-caption text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the page...
        </p>
      )}

      {state === 'error' && (
        <p className="mt-2.5 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-caption text-warning">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error} — you can still continue and save the link on its own.
        </p>
      )}

      {preview && (
        <div className="mt-3 flex gap-3 overflow-hidden rounded-xl bg-surface p-3 shadow-card ring-1 ring-border-subtle">
          {preview.imageUrl && (
            <img
              src={preview.imageUrl}
              alt=""
              className="h-[68px] w-[92px] shrink-0 rounded-lg object-cover object-top"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary">{preview.title || preview.domain}</p>
            <p className="mt-0.5 line-clamp-2 text-caption text-text-secondary">{preview.description}</p>
            <p className="mt-1 truncate text-caption text-primary">{preview.domain}</p>
          </div>
        </div>
      )}

      <div className="mt-3">
        <Field label="Add your thoughts (optional)">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={2}
            placeholder="Why you saved this..."
            className={`${inputClass} resize-y`}
          />
        </Field>
      </div>
    </Panel>
  )
}

// ── Screenshot ──────────────────────────────────────────────────────────
// OCR runs in the browser, so the text is ready before analysis starts and the
// user can see what was actually read off the image.
export function ScreenshotInput({ file, onFile, ocrText, onOcrText, notes, onNotesChange }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [ocrState, setOcrState] = useState('idle')
  const [justPasted, setJustPasted] = useState(false)

  // ⌘V anywhere in the panel. A screenshot is almost always already on the
  // clipboard when you reach this tab, so making the user save it to disk
  // first is the one step worth removing.
  //
  // Only images are intercepted — pasting text into the notes field below
  // still behaves normally.
  useEffect(() => {
    const onPaste = (e) => {
      const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'))
      if (!item) return

      const pasted = item.getAsFile()
      if (!pasted) return

      e.preventDefault()
      // Clipboard images come through unnamed; give it one so the extension
      // check on upload still works.
      const named = new File([pasted], pasted.name || `screenshot.${item.type.split('/')[1] || 'png'}`, {
        type: item.type,
      })
      onFile(named)
      setJustPasted(true)
    }

    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [onFile])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!file) return
    let cancelled = false

    const run = async () => {
      setOcrState('running')
      try {
        const { default: Tesseract } = await import('tesseract.js')
        const { data } = await Tesseract.recognize(file, 'eng')
        if (!cancelled) {
          onOcrText(data.text.trim())
          setOcrState('done')
        }
      } catch {
        if (!cancelled) setOcrState('failed')
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [file, onOcrText])

  return (
    <Panel title="Upload a screenshot" hint="We read any text in the image automatically.">
      {!file ? (
        <div>
          <UploadField accept="image/*" description="PNG or JPG screenshot" onFile={onFile} />
          <p className="mt-2 text-center text-caption text-text-secondary">
            ...or just paste one with{' '}
            <kbd className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-text-primary">
              {typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘V' : 'Ctrl V'}
            </kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-muted ring-1 ring-border-subtle">
            {previewUrl && <img src={previewUrl} alt="" className="max-h-[220px] w-full object-contain" />}
            {justPasted && (
              <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-text-secondary backdrop-blur">
                Pasted
              </span>
            )}
            <button
              onClick={() => {
                onFile(null)
                onOcrText('')
                setOcrState('idle')
                setJustPasted(false)
              }}
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-text-secondary shadow-card backdrop-blur transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>

          {ocrState === 'running' && (
            <p className="flex items-center gap-2 text-caption text-text-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the text in your image...
            </p>
          )}
          {ocrState === 'done' && ocrText && (
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="mb-1 text-caption font-medium text-text-primary">Text we found</p>
              <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-caption text-text-secondary">
                {ocrText}
              </p>
            </div>
          )}
          {(ocrState === 'failed' || (ocrState === 'done' && !ocrText)) && (
            <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-caption text-warning">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              No readable text found — add a note below so this is still findable later.
            </p>
          )}

          <Field label="Add your thoughts (optional)">
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="What this screenshot shows..."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      )}
    </Panel>
  )
}

// ── PDF ─────────────────────────────────────────────────────────────────
export function PdfInput({ file, onFile, thumbnail, onThumbnail, notes, onNotesChange }) {
  const [pageCount, setPageCount] = useState(null)

  useEffect(() => {
    if (!file) {
      onThumbnail(null)
      setPageCount(null)
      return
    }
    let cancelled = false

    // Page 1 is rendered in the browser — the server has no canvas, and this
    // is what becomes the card's artwork.
    import('../../../lib/pdfThumbnail.js')
      .then(({ renderPdfPreview }) => renderPdfPreview(file))
      .then((result) => {
        if (cancelled) return
        onThumbnail(result?.blob || null)
        setPageCount(result?.pageCount || null)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [file, onThumbnail])

  return (
    <Panel title="Upload a PDF" hint="We pull the text out and read it.">
      {!file ? (
        <UploadField accept="application/pdf" description="Any PDF up to 20 MB" onFile={onFile} />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-card ring-1 ring-border-subtle">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <FileText className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
              <p className="text-caption text-text-secondary">
                {formatSize(file.size)}
                {pageCount ? ` · ${pageCount} page${pageCount === 1 ? '' : 's'}` : ''}
              </p>
            </div>
            <button
              onClick={() => onFile(null)}
              aria-label="Remove PDF"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          </div>

          <Field label="Add your thoughts (optional)">
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={2}
              placeholder="What you want to remember from it..."
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      )}
    </Panel>
  )
}
