import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { apiFetch } from '../../lib/apiFetch.js'
import { analyze, commit } from '../../lib/composeApi.js'
import { useLocalStorage } from '../../lib/useLocalStorage.js'
import StepIndicator from './StepIndicator.jsx'
import InputPicker from './InputPicker.jsx'
import ProcessingStep from './ProcessingStep.jsx'
import ReviewStep from './ReviewStep.jsx'
import SavedStep from './SavedStep.jsx'
import WhatsappInput from './inputs/WhatsappInput.jsx'
import { NoteInput, TextInput, QuestionInput, JobInput } from './inputs/SimpleInputs.jsx'
import { LinkInput, ScreenshotInput, PdfInput } from './inputs/FileInputs.jsx'

const EMPTY_JOB = { role: '', company: '', applyUrl: '', salary: '', deadline: '', notes: '' }

const readAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsText(file)
  })

/**
 * The Add Content flow: choose → understand → review → saved, all in one
 * modal.
 *
 * The important property is that **nothing is written until the review step is
 * confirmed**. Step 2 calls /analyze, which does every AI operation against a
 * buffer and persists nothing; only "Save to vault" calls /commit. Closing the
 * modal at any earlier point leaves the vault untouched.
 */
function AddContentFlow({ onSaved, onNavigate }) {
  const [step, setStep] = useState('choose')
  const [kind, setKind] = useLocalStorage('pmv.ingest.kind', 'note')

  // Per-input state. Kept flat rather than one object per panel so switching
  // tabs doesn't lose what you already typed in another.
  const noteRef = useRef(null)
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [url, setUrl] = useState('')
  const [linkPreview, setLinkPreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfThumb, setPdfThumb] = useState(null)
  const [waFile, setWaFile] = useState(null)
  const [waCategories, setWaCategories] = useState([])
  const [job, setJob] = useState(EMPTY_JOB)
  // On by default: this flow exists so the AI does the organising.
  const [generateSummary, setGenerateSummary] = useState(true)

  const [phases, setPhases] = useState({})
  const [draft, setDraft] = useState(null)
  const [review, setReview] = useState(null)
  const [saved, setSaved] = useState(null)
  const [batch, setBatch] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const abortRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => () => abortRef.current?.abort(), [])

  const resetForAnother = () => {
    setStep('choose')
    setText('')
    setNotes('')
    setUrl('')
    setLinkPreview(null)
    setImageFile(null)
    setOcrText('')
    setPdfFile(null)
    setPdfThumb(null)
    setWaFile(null)
    setWaCategories([])
    setJob(EMPTY_JOB)
    setGenerateSummary(true)
    setPhases({})
    setDraft(null)
    setReview(null)
    setSaved(null)
    setBatch(null)
    setError(null)
    noteRef.current?.clear()
  }

  // Whether there's enough to analyse. Prevents burning an AI call on an
  // empty form.
  const canContinue = () => {
    switch (kind) {
      case 'note':
        return true
      case 'text':
      case 'question':
        return text.trim().length > 0
      case 'link':
        return /^https?:\/\/\S+\.\S+/i.test(url.trim())
      case 'image':
        return Boolean(imageFile) && (ocrText.trim().length > 0 || notes.trim().length > 0)
      case 'pdf':
        return Boolean(pdfFile)
      case 'whatsapp':
        return Boolean(waFile)
      case 'job':
        return job.role.trim().length > 0 || job.company.trim().length > 0
      default:
        return false
    }
  }

  const buildAnalyzePayload = () => {
    const form = new FormData()
    form.append('kind', kind)
    form.append('generateSummary', generateSummary ? 'true' : 'false')
    if (notes.trim()) form.append('notes', notes.trim())

    if (kind === 'note') form.append('html', noteRef.current?.getHtml() || '')
    if (kind === 'text' || kind === 'question') form.append('text', text)
    if (kind === 'link') {
      form.append('url', url.trim())
      form.append('linkType', /linkedin\.com/i.test(url) ? 'linkedin' : 'blog')
    }
    if (kind === 'image') form.append('text', ocrText)
    if (kind === 'pdf' && pdfFile) form.append('file', pdfFile)
    if (kind === 'job') for (const [key, val] of Object.entries(job)) form.append(key, val)

    return form
  }

  const runAnalyze = async () => {
    setError(null)
    setPhases({})
    setStep('processing')

    abortRef.current = new AbortController()
    try {
      const result = await analyze(buildAnalyzePayload(), {
        signal: abortRef.current.signal,
        onPhase: (phase, status) => setPhases((prev) => ({ ...prev, [phase]: status })),
      })

      const s = result.suggestions || {}
      setDraft(result)
      setReview({
        title: s.title || '',
        subtitle: s.subtitle || '',
        summary: s.summary || '',
        keyPoints: s.keyPoints || [],
        categories: s.category ? [s.category] : [],
        notes: notes.trim(),
        edited: {},
      })
      setStep('review')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setStep('choose')
    }
  }

  // WhatsApp skips review: an export is many items, and there is no single
  // thing to confirm. It uses the existing batch route.
  const runWhatsappImport = async () => {
    setError(null)
    setBusy(true)
    setStep('processing')
    setPhases({ extract: 'active' })

    try {
      const body = await readAsText(waFile)
      setPhases({ extract: 'done', understand: 'active' })

      const res = await apiFetch(`/api/items/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: body,
          notes,
          generateSummary: generateSummary ? 'true' : 'false',
          categories: waCategories,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not import that export')

      setPhases({ extract: 'done', understand: 'done', embed: 'done', duplicates: 'done' })
      setBatch(data)
      setStep('saved')
      onSaved?.()
    } catch (err) {
      setError(err.message)
      setStep('choose')
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => {
    setBusy(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('draftToken', draft.draftToken)
      form.append('kind', kind)
      form.append('title', review.title)
      form.append('subtitle', review.subtitle)
      form.append('summary', review.summary)
      form.append('keyPoints', JSON.stringify(review.keyPoints))
      form.append('categories', JSON.stringify(review.categories))
      if (review.notes.trim()) form.append('notes', review.notes.trim())

      // Re-sent so the draft can be rebuilt if it expired while reviewing.
      if (kind === 'note') form.append('html', noteRef.current?.getHtml() || '')
      if (kind === 'text' || kind === 'question') form.append('text', text)
      if (kind === 'link') {
        form.append('url', url.trim())
        form.append('linkType', /linkedin\.com/i.test(url) ? 'linkedin' : 'blog')
      }
      if (kind === 'image') {
        form.append('text', ocrText)
        if (imageFile) form.append('file', imageFile)
      }
      if (kind === 'pdf') {
        if (pdfFile) form.append('file', pdfFile)
        if (pdfThumb) form.append('thumbnail', pdfThumb, 'preview.png')
      }
      if (kind === 'job') for (const [key, val] of Object.entries(job)) form.append(key, val)

      const item = await commit(form)
      setSaved(item)
      setStep('saved')
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // ⌘↵ advances from wherever you are; Esc steps back rather than closing the
  // whole modal mid-flow.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (step === 'choose' && canContinue() && !busy) {
          kind === 'whatsapp' ? runWhatsappImport() : runAnalyze()
        } else if (step === 'review' && !busy) {
          handleSave()
        }
      }
      if (e.key === 'Escape' && step === 'review') {
        e.stopPropagation()
        setStep('choose')
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  })

  const onPreview = useCallback((p) => setLinkPreview(p), [])
  const onOcr = useCallback((t) => setOcrText(t), [])
  const onThumb = useCallback((b) => setPdfThumb(b), [])

  const renderInput = () => {
    switch (kind) {
      case 'note':
        return <NoteInput ref={noteRef} />
      case 'text':
        return <TextInput value={text} onChange={setText} notes={notes} onNotesChange={setNotes} />
      case 'question':
        return <QuestionInput value={text} onChange={setText} notes={notes} onNotesChange={setNotes} />
      case 'job':
        return <JobInput value={job} onChange={setJob} />
      case 'link':
        return (
          <LinkInput
            value={url}
            onChange={setUrl}
            notes={notes}
            onNotesChange={setNotes}
            preview={linkPreview}
            onPreview={onPreview}
          />
        )
      case 'image':
        return (
          <ScreenshotInput
            file={imageFile}
            onFile={setImageFile}
            ocrText={ocrText}
            onOcrText={onOcr}
            notes={notes}
            onNotesChange={setNotes}
          />
        )
      case 'pdf':
        return (
          <PdfInput
            file={pdfFile}
            onFile={setPdfFile}
            thumbnail={pdfThumb}
            onThumbnail={onThumb}
            notes={notes}
            onNotesChange={setNotes}
          />
        )
      case 'whatsapp':
        return (
          <WhatsappInput
            file={waFile}
            onFile={setWaFile}
            notes={notes}
            onNotesChange={setNotes}
            categories={waCategories}
            onCategoriesChange={setWaCategories}
          />
        )
      default:
        return null
    }
  }

  const transition = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.18, ease: 'easeOut' },
      }

  return (
    <div>
      <div className="mb-4 flex justify-center border-b border-border-subtle pb-4">
        <StepIndicator current={step} />
      </div>

      {error && (
        <p className="mb-3 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-caption text-warning">
          <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      {/* `layout` on the wrapper eases the dialog between step heights instead
          of snapping — the four steps differ by a few hundred pixels, and the
          jump was the main thing making this read as four pages rather than
          one surface. Only the height animates; the content crossfades. */}
      <motion.div layout={!reduceMotion} transition={{ duration: 0.25, ease: 'easeOut' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} {...transition}>
          {step === 'choose' && (
            <div className="space-y-4">
              <InputPicker value={kind} onChange={setKind} />
              {renderInput()}

              {/* On by default — the AI doing the work is the point of this
                  flow. Turning it off genuinely skips the Gemini call rather
                  than hiding the result, so it's faster and costs no quota;
                  the item is still embedded, so it stays searchable and still
                  gets a duplicate check. */}
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                    <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                    Let AI write the title, category and summary
                  </span>
                  <span className="mt-0.5 block text-caption text-text-secondary">
                    {generateSummary
                      ? "You'll review everything before it saves."
                      : "You'll fill these in yourself on the next step."}
                  </span>
                </span>
                <button
                  role="switch"
                  aria-checked={generateSummary}
                  aria-label="Let AI write the title, category and summary"
                  onClick={() => setGenerateSummary((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    generateSummary ? 'bg-primary' : 'bg-border-subtle'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-transform duration-200 ${
                      generateSummary ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && <ProcessingStep phases={phases} />}

          {step === 'review' && review && (
            <ReviewStep
              draft={draft}
              value={review}
              onChange={setReview}
              onOpenDuplicate={(id) => onNavigate?.(`/library/${id}`)}
            />
          )}

          {step === 'saved' && batch && (
            <div className="py-6 text-center">
              <h3 className="text-[19px] font-semibold text-text-primary">
                Imported {batch.count} {batch.count === 1 ? 'message' : 'messages'}
              </h3>
              <p className="mt-1 text-body text-text-secondary">
                Each one is now its own item, categorised in the background.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  onClick={resetForAnother}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-text-primary ring-1 ring-border-subtle transition-colors hover:bg-muted"
                >
                  Add another
                </button>
                <button
                  onClick={() => onNavigate?.('/library')}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
                >
                  View in Library
                </button>
              </div>
            </div>
          )}

          {step === 'saved' && saved && (
            <SavedStep
              item={saved}
              categories={review?.categories || []}
              onOpen={() => onNavigate?.(`/library/${saved.id}`)}
              onAsk={() => onNavigate?.('/chat')}
              onAddAnother={resetForAnother}
              onDone={() => onNavigate?.('/library')}
            />
          )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {(step === 'choose' || step === 'review') && (
        <div className="mt-5 flex items-center justify-between border-t border-border-subtle pt-4">
          {step === 'review' ? (
            <button
              onClick={() => setStep('choose')}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back
            </button>
          ) : (
            <p className="text-caption text-text-secondary">
              Nothing is saved until you confirm on the next step.
            </p>
          )}

          <button
            onClick={
              step === 'review' ? handleSave : kind === 'whatsapp' ? runWhatsappImport : runAnalyze
            }
            disabled={busy || (step === 'choose' && !canContinue())}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition-all duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving...
              </>
            ) : step === 'review' ? (
              <>Save to vault <ArrowRight className="h-4 w-4" strokeWidth={2} /></>
            ) : kind === 'whatsapp' ? (
              <>Import chat <ArrowRight className="h-4 w-4" strokeWidth={2} /></>
            ) : generateSummary ? (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={2} /> Analyze content
              </>
            ) : (
              <>Continue <ArrowRight className="h-4 w-4" strokeWidth={2} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default AddContentFlow
