import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BookCheck,
  Copy,
  ExternalLink,
  Highlighter,
  Link2,
  NotebookPen,
  Pencil,
  Plus,
  Star,
  Trash2,
  WandSparkles,
  X,
} from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import EditableSection from '../components/EditableSection.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { DuplicateChip, Chip } from '../components/Chip.jsx'
import CategoryPicker from '../components/CategoryPicker.jsx'
import ItemChatPanel from '../components/ItemChatPanel.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import ContentSurface, { bodyHtml } from '../components/item/ContentSurface.jsx'
import ReadingModeToggle from '../components/item/ReadingModeToggle.jsx'
import AnnotationList from '../components/item/AnnotationList.jsx'
import AiActionDrawer from '../components/item/AiActionDrawer.jsx'
import RelatedItems from '../components/item/RelatedItems.jsx'
import Lightbox from '../components/item/Lightbox.jsx'
import ReadingProgress, { useReadingProgress } from '../components/item/ReadingProgress.jsx'
import { MAX_CATEGORIES, FAVORITE_TAG, itemCategories } from '../lib/categories.js'
import { parseTitle } from '../lib/parseTitle.js'
import { sourceUrl } from '../lib/itemFilters.js'
import { savedAgoLong } from '../lib/relativeTime.js'
import { structuredTextToHtml } from '../lib/contentHtml.js'

const SOURCE_TYPE_LABEL = {
  text: 'Pasted text',
  question: 'Interview question',
  job: 'Job posting',
  link: 'Saved link',
  pdf: 'PDF document',
  image: 'Image',
  note: 'My own note',
  linkedin_paste: 'LinkedIn post',
  whatsapp_export: 'WhatsApp message',
}

function SidebarCard({ title, count, children }) {
  return (
    <Card className="p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-text-secondary">
        {title}
        {count > 0 && (
          <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-text-secondary">
            {count}
          </span>
        )}
      </p>
      {children}
    </Card>
  )
}

function QuickAction({ Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-caption font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        danger ? 'text-warning hover:bg-warning/10' : 'text-text-primary hover:bg-muted'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
    </button>
  )
}

/**
 * The item as a reading workspace.
 *
 * The imported content is read-only source. Everything the user marks on it —
 * highlights, notes, formatting, saved AI answers — is stored separately in
 * the annotations table and drawn over the top, so re-importing or re-parsing
 * an item can never destroy what they wrote about it.
 */
function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [item, setItem] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [orphanIds, setOrphanIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)

  const [mode, setMode] = useLocalStorage('pmv.item.mode', 'annotate')
  const [aiSelection, setAiSelection] = useState(null)
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const [focusAnnotationId, setFocusAnnotationId] = useState(null)

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [subtitleDraft, setSubtitleDraft] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [contentDraft, setContentDraft] = useState('')

  const contentEditorRef = useRef(null)
  const engagedIdRef = useRef(null)

  // Progress is measured against the article itself, so the summary and notes
  // above it don't count as reading. A callback ref rather than useRef: the
  // article card doesn't exist on the first render, and the hook has to re-run
  // when it appears.
  const [articleEl, setArticleEl] = useState(null)
  const progress = useReadingProgress(articleEl)

  // `silent` re-reads the item without swapping the page for a skeleton — used
  // after tag and favourite changes, where blanking the view for a one-chip
  // update is jarring and loses your scroll position.
  const fetchItem = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true)
      const res = await fetch(`${API_URL}/api/items/${id}`)
      if (res.ok) setItem(await res.json())
      if (!silent) setLoading(false)
    },
    [id],
  )

  useEffect(() => {
    fetchItem()
    fetch(`${API_URL}/api/items/${id}/annotations`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setAnnotations)
      .catch(() => setAnnotations([]))
  }, [id, fetchItem])

  // Viewing an item counts as engaging with it — no separate "mark reviewed"
  // action needed. Guarded against re-firing on every re-render.
  useEffect(() => {
    if (!item || engagedIdRef.current === item.id) return
    engagedIdRef.current = item.id
    fetch(`${API_URL}/api/items/${item.id}/engage`, { method: 'PATCH' })
  }, [item])

  // ── Annotations ────────────────────────────────────────────────────────
  const sortAnnotations = (list) => [...list].sort((a, b) => a.start_offset - b.start_offset)

  const createAnnotation = async (payload) => {
    const res = await fetch(`${API_URL}/api/items/${id}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) return showToast('Could not save that annotation', 'error')

    // Appended rather than refetched: the row that comes back is the whole
    // annotation, and a refetch would repaint the entire layer for one span.
    const created = await res.json()
    setAnnotations((prev) => sortAnnotations([...prev, created]))
  }

  const patchAnnotation = async (annotation, updates) => {
    const res = await fetch(`${API_URL}/api/annotations/${annotation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!res.ok) return showToast('Could not update that annotation', 'error')

    const updated = await res.json()
    setAnnotations((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
  }

  const deleteAnnotation = async (annotation) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== annotation.id))
    const res = await fetch(`${API_URL}/api/annotations/${annotation.id}`, { method: 'DELETE' })
    if (!res.ok) {
      showToast('Could not delete that annotation', 'error')
      setAnnotations((prev) => sortAnnotations([...prev, annotation]))
    }
  }

  // Compared before storing so an identical result doesn't re-render the page
  // every time the annotation layer is redrawn.
  const handleOrphans = useCallback((orphans) => {
    setOrphanIds((prev) => {
      const next = new Set(orphans.map((o) => o.id))
      if (prev.size === next.size && [...next].every((orphanId) => prev.has(orphanId))) return prev
      return next
    })
  }, [])

  // ── Item-level actions ─────────────────────────────────────────────────
  const handleFieldSave = async (fields) => {
    const res = await fetch(`${API_URL}/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })

    if (!res.ok) return showToast('Could not save your changes', 'error')

    // Merged rather than replaced: the PATCH response is the raw row and
    // doesn't carry the computed duplicateOf/relatedItems fields.
    const updated = await res.json()
    setItem((prev) => ({ ...prev, ...updated }))
    showToast('Saved')
  }

  const setStatus = async (patch, message) => {
    const res = await fetch(`${API_URL}/api/items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })

    if (!res.ok) return showToast('Could not update this item', 'error')

    const data = await res.json()
    setItem((prev) => ({ ...prev, read_at: data.read_at, archived_at: data.archived_at }))
    showToast(message)
  }

  const handleToggleFavorite = async () => {
    const isFavorite = item.tags?.some((t) => t.tag === FAVORITE_TAG)
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: isFavorite ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: FAVORITE_TAG }),
    })
    showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    fetchItem({ silent: true })
  }

  const handleCopyLink = async () => {
    const url = sourceUrl(item)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      showToast('Source link copied')
    } catch {
      showToast('Could not copy link', 'error')
    }
  }

  const handleDelete = async () => {
    await fetch(`${API_URL}/api/items/${id}`, { method: 'DELETE' })
    showToast('Item deleted')
    navigate('/library')
  }

  const startEditingTitle = () => {
    const { title: currentTitle, subtitle: currentSubtitle } = parseTitle(item.title)
    setTitleDraft(currentTitle || '')
    setSubtitleDraft(currentSubtitle || '')
    setEditingTitle(true)
  }

  const saveTitle = async () => {
    await handleFieldSave({ title: titleDraft, subtitle: subtitleDraft })
    setEditingTitle(false)
  }

  // At least one category must remain — the picker and the chip row both
  // prevent removing the last one, and the server rejects an empty list.
  const saveCategories = async (next) => {
    if (!next.length) return
    await handleFieldSave({ categories: next })
    setAddingCategory(false)
  }

  // Editing the article itself, as opposed to annotating it. Notes are already
  // HTML; everything else is plain text that has to be converted for the
  // editor — links included, or they'd be lost on save.
  //
  // Safe alongside annotations now: they anchor by quote and context, so an
  // edit that moves text re-anchors them rather than scattering them (see
  // lib/annotations.js). Anything whose words genuinely disappear is reported
  // as orphaned instead of vanishing.
  const startEditingContent = () => {
    const existing =
      item.formatted_content ||
      (item.source_type === 'note' ? item.raw_content : structuredTextToHtml(item.extracted_text))
    setContentDraft(existing || '')
    setEditingContent(true)
  }

  const saveContent = async () => {
    const html = contentEditorRef.current?.getHtml() || ''
    if (!contentEditorRef.current?.getText()?.trim() && !html.includes('<img')) {
      showToast("Content can't be empty", 'error')
      return
    }
    await handleFieldSave({ formattedContent: html })
    setEditingContent(false)
  }

  const jumpToAnnotation = (annotationId) => {
    // Cleared first so jumping to the same annotation twice still scrolls.
    setFocusAnnotationId(null)
    requestAnimationFrame(() => setFocusAnnotationId(annotationId))
  }

  if (loading) {
    return (
      <div>
        <SkeletonCard />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="py-16 text-center text-text-secondary">
        <p className="text-sm">Item not found.</p>
        <button onClick={() => navigate('/library')} className="mt-2 text-sm text-primary hover:underline">
          Back to Library
        </button>
      </div>
    )
  }

  const isFavorite = item.tags?.some((t) => t.tag === FAVORITE_TAG)
  const { title, subtitle } = parseTitle(item.title)
  const categories = itemCategories(item)
  const reading = mode === 'read'
  const hasBody = Boolean(bodyHtml(item))
  const link = sourceUrl(item)

  return (
    <div>
      <ReadingProgress progress={progress} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/library')}
          className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Library
        </button>

        <div className="flex items-center gap-2">
          {hasBody && <ReadingModeToggle mode={mode} onChange={setMode} />}
          <button
            onClick={handleToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            // h-10 to match the mode toggle beside it — the filled pill made
            // that control 40px tall, and a 36px neighbour reads as misaligned.
            className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-raised ring-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isFavorite
                ? 'bg-accent-light text-accent ring-accent/20'
                : 'bg-surface text-text-secondary ring-border-subtle hover:text-text-primary'
            }`}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-accent' : ''}`} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* An archived item is hidden from the Library, so this page is the only
          place left that can offer a way back out. */}
      {item.archived_at && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-muted px-4 py-2.5 ring-1 ring-border-subtle">
          <Archive className="h-4 w-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 text-caption text-text-secondary">
            Archived {savedAgoLong(item.archived_at)}. Hidden from your Library, still answerable in Ask My
            Vault.
          </p>
          <button
            onClick={() => setStatus({ archived: false }, 'Restored to your Library')}
            className="rounded-lg bg-surface px-2.5 py-1 text-caption font-medium text-primary shadow-card transition-colors duration-150 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Unarchive
          </button>
        </div>
      )}

      <div className={`flex flex-col gap-6 ${reading ? '' : 'lg:flex-row'}`}>
        <div className={`min-w-0 flex-1 ${reading ? 'mx-auto w-full max-w-[760px]' : ''}`}>
          {editingTitle ? (
            <div className="mb-3 flex flex-col gap-2">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Title (1-2 words)"
                autoFocus
                className="rounded-xl border border-border-subtle px-3 py-2 text-[22px] font-semibold text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                value={subtitleDraft}
                onChange={(e) => setSubtitleDraft(e.target.value)}
                placeholder="Short subtitle"
                className="rounded-xl border border-border-subtle px-3 py-2 text-sm text-text-secondary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <Button onClick={saveTitle}>Save</Button>
                <Button variant="ghost" onClick={() => setEditingTitle(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="group mb-2 flex items-start gap-2">
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-text-primary">
                  {title || <span className="text-text-secondary">Untitled</span>}
                </h1>
                {subtitle && <p className="mt-1 text-body text-text-secondary">{subtitle}</p>}
              </div>
              <button
                onClick={startEditingTitle}
                aria-label="Edit title"
                className="mt-1 rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-muted hover:text-text-primary focus:opacity-100 group-hover:opacity-100"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          )}

          {/* Byline: who wrote it and when it was saved, the way an article
              header reads — before any of the vault's own metadata. */}
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-caption text-text-secondary">
            <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
            {item.author && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-text-primary">{item.author}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>Saved {savedAgoLong(item.created_at)}</span>
            {item.read_at && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <BookCheck className="h-3 w-3" strokeWidth={2} /> Read
              </span>
            )}
            {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
            {item.subcategory && <Chip>{item.subcategory}</Chip>}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {categories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-caption font-medium text-primary"
              >
                {category}
                {categories.length > 1 && (
                  <button
                    onClick={() => saveCategories(categories.filter((c) => c !== category))}
                    aria-label={`Remove category ${category}`}
                    className="hover:text-primary-hover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}

            {categories.length < MAX_CATEGORIES && (
              <button
                onClick={() => setAddingCategory((v) => !v)}
                aria-label="Add category"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-subtle px-2.5 py-0.5 text-caption text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" /> Category
              </button>
            )}
          </div>

          {addingCategory && (
            <div className="mb-4 max-w-md">
              <CategoryPicker value={categories} onChange={saveCategories} label="" showChips={false} />
            </div>
          )}

          {item.duplicateOf && (
            <Card className="mb-4 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    This looks like a duplicate ({Math.round(item.duplicateOf.similarity * 100)}% match)
                  </p>
                  <p className="mt-1 truncate text-sm text-text-secondary">
                    Possibly the same as:{' '}
                    {parseTitle(item.duplicateOf.title).title ||
                      item.duplicateOf.summary ||
                      'another saved item'}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/library/${item.duplicateOf.id}`)}
                    >
                      View Original
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDeleteOpen(true)}>
                      <Trash2 className="h-4 w-4" /> Delete this duplicate
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* The gist sits above the content, not beside it — it's what you
              read first to decide whether to read the rest. Hidden in reading
              mode, where the content is the point. */}
          {!reading && (
            <>
              <EditableSection
                label="AI Summary"
                value={item.summary}
                placeholder="Write a summary of this item..."
                emptyLabel="No AI summary — add your own."
                onSave={(next) => handleFieldSave({ summary: next })}
              />

              {/* Above the article rather than below it: you read the gist,
                  write down what you're looking for, then read. Underneath a
                  long piece the box was a scroll away from every thought that
                  would have gone in it. */}
              <EditableSection
                label="My Notes"
                value={item.notes}
                placeholder="Why did you save this? What stood out?"
                emptyLabel="No notes yet."
                emptyTitle="Capture your thoughts while reading"
                emptyHelp="Your notes stay attached to this item and are searchable across your whole vault later."
                emptyCta="Add first note"
                EmptyIcon={NotebookPen}
                onSave={(next) => handleFieldSave({ notes: next })}
              />

              {item.key_points?.length > 0 && (
                <Card className="mb-4">
                  <h2 className="mb-2.5 flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                    <WandSparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                    Key points
                  </h2>
                  <ul className="space-y-2">
                    {item.key_points.map((point, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                        <span className="text-body leading-relaxed text-text-primary">{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {item.source_type === 'job' &&
                (item.company || item.role || item.deadline || item.salary) && (
                  <Card className="mb-4">
                    <h2 className="mb-2.5 text-caption font-semibold uppercase tracking-wide text-text-secondary">
                      Role details
                    </h2>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      {[
                        ['Role', item.role],
                        ['Company', item.company],
                        ['Salary', item.salary],
                        ['Deadline', item.deadline && new Date(item.deadline).toLocaleDateString()],
                      ]
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-caption text-text-secondary">{label}</dt>
                            <dd className="text-body text-text-primary">{value}</dd>
                          </div>
                        ))}
                    </dl>
                    {item.apply_url && (
                      <a
                        href={item.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-light px-3 py-1.5 text-caption font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                      >
                        Open application <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </Card>
                )}
            </>
          )}

          {/* The reading surface. Annotating never touches this text — marks
              live in the annotations table — but the text itself is still
              editable, which is a different action and is what Edit does. */}
          <Card className="mb-4 p-5 sm:p-7" ref={setArticleEl}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                {item.formatted_content ? 'Content' : 'Original content'}
              </p>

              <div className="flex items-center gap-2.5">
                {progress !== null && !editingContent && (
                  <span className="text-[11px] tabular-nums text-text-secondary">
                    {Math.round(progress * 100)}% read
                  </span>
                )}
                {hasBody && mode === 'annotate' && !editingContent && (
                  <span className="hidden items-center gap-1.5 text-[11px] text-text-secondary lg:flex">
                    <Highlighter className="h-3 w-3" strokeWidth={1.75} />
                    Select any text to annotate
                  </span>
                )}
                {!editingContent && (
                  <button
                    onClick={startEditingContent}
                    className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-caption text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /> Edit
                  </button>
                )}
              </div>
            </div>

            {editingContent && (
              <div className="flex animate-fadeUp flex-col gap-3">
                <RichTextEditor
                  ref={contentEditorRef}
                  initialHtml={contentDraft}
                  onStatus={(s) => s?.type === 'error' && showToast(s.message, 'error')}
                  placeholder="Edit this content — headings, lists, bold, links, images..."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={saveContent}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditingContent(false)}>
                    Cancel
                  </Button>
                  <p className="text-[11px] text-text-secondary">
                    Your highlights re-attach to their own words after an edit.
                  </p>
                </div>
              </div>
            )}

            <div className={`flex flex-col gap-4 ${editingContent ? 'hidden' : ''}`}>
              {item.source_type === 'link' && (
                <a
                  href={item.raw_content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 break-all text-caption text-text-secondary hover:text-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" /> View original
                </a>
              )}

              {item.source_type === 'link' && item.file_url && (
                <img
                  src={item.file_url}
                  alt=""
                  onClick={() => setLightboxSrc(item.file_url)}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                  className="w-full max-w-2xl cursor-zoom-in rounded-xl ring-1 ring-border-subtle"
                />
              )}

              {item.source_type === 'image' &&
                (item.file_url ? (
                  <img
                    src={item.file_url}
                    alt="Original upload"
                    onClick={() => setLightboxSrc(item.file_url)}
                    className="max-h-96 w-auto cursor-zoom-in rounded-xl object-contain ring-1 ring-border-subtle"
                  />
                ) : (
                  <p className="text-caption italic text-text-secondary">
                    Original image not stored for this item (saved before file storage was added).
                  </p>
                ))}

              {item.source_type === 'pdf' &&
                (item.file_url ? (
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open original PDF
                  </a>
                ) : (
                  <p className="text-caption italic text-text-secondary">
                    Original PDF not stored for this item (saved before file storage was added).
                  </p>
                ))}

              <ContentSurface
                item={item}
                annotations={annotations}
                mode={mode}
                onCreate={createAnnotation}
                onUpdateNote={(annotation, note) => patchAnnotation(annotation, { note })}
                onColor={(annotation, color) => patchAnnotation(annotation, { color })}
                onDelete={deleteAnnotation}
                onAskAi={setAiSelection}
                onOrphans={handleOrphans}
                onImageClick={setLightboxSrc}
                focusAnnotationId={focusAnnotationId}
              />

              {!hasBody && !item.file_url && (
                <p className="text-caption italic text-text-secondary">No content stored for this item.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Reading mode drops the whole rail: the point of the mode is that
            nothing but the content is on screen. */}
        {!reading && (
          <aside className="flex shrink-0 flex-col gap-4 lg:w-[300px]">
            <SidebarCard title="Details">
              <dl className="flex flex-col gap-2 text-caption">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-text-secondary">Content type</dt>
                  <dd className="text-right text-text-primary">
                    {SOURCE_TYPE_LABEL[item.source_type] || item.source_type}
                  </dd>
                </div>

                {link && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-text-secondary">Source</dt>
                    <dd className="min-w-0 text-right">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
                      >
                        <span className="truncate">{new URL(link).hostname.replace(/^www\./, '')}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </dd>
                  </div>
                )}

                {item.author && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-text-secondary">Author</dt>
                    <dd className="min-w-0 truncate text-right text-text-primary">{item.author}</dd>
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-text-secondary">Saved on</dt>
                  <dd className="text-right text-text-primary">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </dd>
                </div>

                {item.duplicateCount > 0 && (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-text-secondary">Duplicates</dt>
                    <dd className="text-right text-text-primary">
                      {item.duplicateCount} similar {item.duplicateCount === 1 ? 'item' : 'items'}
                    </dd>
                  </div>
                )}
              </dl>

              {item.tags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.tags.map((t, i) => (
                    <Chip key={i}>{t.tag}</Chip>
                  ))}
                </div>
              )}
            </SidebarCard>

            {hasBody && (
              <SidebarCard title="Highlights & notes" count={annotations.length}>
                <AnnotationList
                  annotations={annotations}
                  orphanIds={orphanIds}
                  onJump={jumpToAnnotation}
                  onDelete={deleteAnnotation}
                />
              </SidebarCard>
            )}

            <ItemChatPanel itemId={item.id} />

            {item.relatedItems?.length > 0 && (
              <SidebarCard title="Related items">
                <RelatedItems items={item.relatedItems} />
              </SidebarCard>
            )}

            <SidebarCard title="Quick actions">
              <div className="-mx-1 flex flex-col">
                <QuickAction
                  Icon={BookCheck}
                  label={item.read_at ? 'Mark as unread' : 'Mark as read'}
                  onClick={() =>
                    setStatus({ read: !item.read_at }, item.read_at ? 'Marked as unread' : 'Marked as read')
                  }
                />
                <QuickAction
                  Icon={item.archived_at ? ArchiveRestore : Archive}
                  label={item.archived_at ? 'Restore from archive' : 'Archive'}
                  onClick={() =>
                    setStatus(
                      { archived: !item.archived_at },
                      item.archived_at ? 'Restored to your Library' : 'Archived',
                    )
                  }
                />
                {link && <QuickAction Icon={Link2} label="Copy source link" onClick={handleCopyLink} />}
                <QuickAction
                  Icon={Trash2}
                  label="Delete item"
                  danger
                  onClick={() => setConfirmDeleteOpen(true)}
                />
              </div>
            </SidebarCard>
          </aside>
        )}
      </div>

      <AiActionDrawer
        open={Boolean(aiSelection)}
        itemId={item.id}
        selection={aiSelection}
        onClose={() => setAiSelection(null)}
        onSaveAsNote={createAnnotation}
      />

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This permanently removes the item, its summary, embedding, highlights and any tags. This can't be undone."
      />
    </div>
  )
}

export default ItemDetail
