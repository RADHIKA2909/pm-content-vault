import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, ExternalLink, ChevronDown, Trash2, Copy, Pencil, Plus, X } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import EditableSection from '../components/EditableSection.jsx'
import PostContent from '../components/PostContent.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { DuplicateChip, Chip } from '../components/Chip.jsx'
import CategoryPicker from '../components/CategoryPicker.jsx'
import ItemChatPanel from '../components/ItemChatPanel.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { MAX_CATEGORIES, FAVORITE_TAG, itemCategories } from '../lib/categories.js'
import { parseTitle } from '../lib/parseTitle.js'
import { structuredTextToHtml } from '../lib/contentHtml.js'

// The item's text body. A formatted version wins when the user has made one;
// otherwise the original extraction is rendered as before.
//
// Rendering the HTML directly is safe: it passed the allowlist sanitizer in
// services/noteContent.js on the way in.
function ContentBody({ item }) {
  if (item.formatted_content) {
    return (
      <div
        className="note-body text-sm text-text-primary"
        dangerouslySetInnerHTML={{ __html: item.formatted_content }}
      />
    )
  }

  if (item.source_type === 'note') {
    return (
      <div
        className="note-body text-sm text-text-primary"
        dangerouslySetInnerHTML={{ __html: item.raw_content || '' }}
      />
    )
  }

  return <PostContent text={item.extracted_text || item.raw_content || 'No content stored.'} />
}

function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  // Open by default — the content is the reason you opened the item.
  const [showOriginal, setShowOriginal] = useState(true)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [subtitleDraft, setSubtitleDraft] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [editingContent, setEditingContent] = useState(false)
  const [contentDraft, setContentDraft] = useState('')
  const contentEditorRef = useRef(null)
  const engagedIdRef = useRef(null)

  // `silent` re-reads the item without swapping the page for a skeleton —
  // used after tag and favourite changes, where blanking the whole view for a
  // one-chip update is jarring and loses your scroll position.
  const fetchItem = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    const res = await fetch(`${API_URL}/api/items/${id}`)
    if (res.ok) {
      const data = await res.json()
      setItem(data)
    }
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    fetchItem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Viewing an item counts as engaging with it — no separate "mark
  // reviewed" action needed. Guard against re-firing on every re-render.
  useEffect(() => {
    if (!item || engagedIdRef.current === item.id) return
    engagedIdRef.current = item.id
    fetch(`${API_URL}/api/items/${item.id}/engage`, { method: 'PATCH' })
  }, [item])

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

  const handleFieldSave = async (fields) => {
    const res = await fetch(`${API_URL}/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })

    if (!res.ok) {
      showToast('Could not save your changes', 'error')
      return
    }

    const updated = await res.json()
    // Merge rather than replace: the PATCH response is the raw row and
    // doesn't carry the computed duplicateOf/relatedItems fields.
    setItem((prev) => ({ ...prev, ...updated }))
    showToast('Saved')
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

  // Notes are already HTML; everything else is plain text that has to be
  // converted for the editor — links included, or they'd be lost on save.
  const startEditingContent = () => {
    const existing =
      item.formatted_content ||
      (item.source_type === 'note' ? item.raw_content : structuredTextToHtml(item.extracted_text))
    setContentDraft(existing || '')
    setEditingContent(true)
    setShowOriginal(true)
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

  // At least one category must remain — the picker and the chip row both
  // prevent removing the last one, and the server rejects an empty list.
  const saveCategories = async (next) => {
    if (!next.length) return
    await handleFieldSave({ categories: next })
    setAddingCategory(false)
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

  return (
    <div>
      <button
        onClick={() => navigate('/library')}
        className="mb-4 flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </button>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
              {item.subcategory && <Chip>{item.subcategory}</Chip>}
              {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleToggleFavorite}>
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-accent text-accent' : ''}`} />
                {isFavorite ? 'Favorited' : 'Add to Favorites'}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          </div>

          {/* The heading the detail view never had — and it's editable, since
              the title and subtitle are the AI's guess rather than the user's. */}
          {editingTitle ? (
            <div className="mb-4 flex flex-col gap-2">
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
            <div className="group mb-4 flex items-start gap-2">
              <div className="min-w-0">
                <h1 className="text-[24px] font-semibold tracking-tight text-text-primary">
                  {title || <span className="text-text-secondary">Untitled</span>}
                </h1>
                {subtitle && <p className="text-body text-text-secondary">{subtitle}</p>}
              </div>
              <button
                onClick={startEditingTitle}
                aria-label="Edit title"
                className="mt-1 rounded-lg p-1.5 text-text-secondary opacity-0 transition-opacity hover:bg-muted hover:text-text-primary focus:opacity-100 group-hover:opacity-100"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* One to three categories, drawn from the fixed taxonomy or
              invented by the user. Shown as chips with a + to add more. */}
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
              <CategoryPicker
                value={categories}
                onChange={saveCategories}
                label=""
                showChips={false}
              />
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
                    {parseTitle(item.duplicateOf.title).title || item.duplicateOf.summary || 'another saved item'}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Button variant="secondary" onClick={() => navigate(`/library/${item.duplicateOf.id}`)}>
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

          <EditableSection
            label="AI Summary"
            value={item.summary}
            placeholder="Write a summary of this item..."
            emptyLabel="No AI summary — add your own."
            onSave={(next) => handleFieldSave({ summary: next })}
          />

          <EditableSection
            label="My Notes"
            value={item.notes}
            placeholder="Why did you save this? What stood out?"
            emptyLabel="No notes yet."
            onSave={(next) => handleFieldSave({ notes: next })}
          />

          <Card>
            <div className="flex w-full items-center justify-between gap-2">
              <button
                onClick={() => setShowOriginal((v) => !v)}
                className="flex min-w-0 flex-1 items-center justify-between text-left"
              >
                <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
                  {item.formatted_content ? 'Content' : 'Original Content'}
                </p>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                {!editingContent && (
                  <button
                    onClick={startEditingContent}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption font-medium text-text-secondary transition-colors hover:bg-muted hover:text-text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit content
                  </button>
                )}
                <button onClick={() => setShowOriginal((v) => !v)} aria-label="Toggle content">
                  <ChevronDown
                    className={`h-4 w-4 text-text-secondary transition-transform ${showOriginal ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {showOriginal && editingContent && (
              <div className="mt-3 flex flex-col gap-3">
                <RichTextEditor
                  ref={contentEditorRef}
                  initialHtml={contentDraft}
                  onStatus={(s) => s?.type === 'error' && showToast(s.message, 'error')}
                  placeholder="Edit this content — bold, underline, highlight..."
                />
                <div className="flex items-center gap-2">
                  <Button onClick={saveContent}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditingContent(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {showOriginal && !editingContent && (
              <div className="mt-3">
                {item.source_type === 'link' && (
                  <div className="flex flex-col gap-4">
                    <a
                      href={item.raw_content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 break-all text-caption text-text-secondary hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" /> View original
                    </a>

                    {item.file_url && (
                      <img
                        src={item.file_url}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                        className="w-full max-w-2xl rounded-xl border border-border-subtle"
                      />
                    )}

                    {/* The whole point of the vault: read the post here
                        instead of opening the original link again. */}
                    {(item.formatted_content ||
                      (item.extracted_text && item.extracted_text !== item.raw_content)) && (
                      <ContentBody item={item} />
                    )}
                  </div>
                )}

                {item.source_type === 'image' && (
                  <div className="flex flex-col gap-3">
                    {item.file_url ? (
                      <img
                        src={item.file_url}
                        alt="Original upload"
                        className="max-h-96 w-auto rounded-xl border border-border-subtle object-contain"
                      />
                    ) : (
                      <p className="text-caption italic text-text-secondary">
                        Original image not stored for this item (saved before file storage was added).
                      </p>
                    )}
                    {(item.formatted_content || item.extracted_text) && <ContentBody item={item} />}
                  </div>
                )}

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

                {item.source_type === 'pdf' && item.formatted_content && (
                  <div className="mt-3">
                    <ContentBody item={item} />
                  </div>
                )}

                {/* Notes are stored as HTML so images, links and lists survive.
                    Safe to render directly: the body was run through the
                    allowlist sanitizer in services/noteContent.js before it
                    was ever saved. */}
                {item.source_type === 'note' && <ContentBody item={item} />}

                {['text', 'linkedin_paste', 'whatsapp_export'].includes(item.source_type) && (
                  <ContentBody item={item} />
                )}
              </div>
            )}
          </Card>
        </div>

        <aside className="flex shrink-0 flex-col gap-4 lg:w-72">
          <Card>
            <p className="mb-3 text-caption font-medium uppercase tracking-wide text-text-secondary">
              About this item
            </p>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-secondary">Source</dt>
                <dd className="text-text-primary">
                  <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-secondary">Saved on</dt>
                <dd className="text-text-primary">{new Date(item.created_at).toLocaleDateString()}</dd>
              </div>
              {item.duplicateCount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-secondary">Duplicates</dt>
                  <dd className="text-text-primary">{item.duplicateCount} similar item(s)</dd>
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
          </Card>

          <ItemChatPanel itemId={item.id} />

          {item.relatedItems?.length > 0 && (
            <Card>
              <p className="mb-3 text-caption font-medium uppercase tracking-wide text-text-secondary">
                Related Items
              </p>
              <ul className="flex flex-col gap-3">
                {item.relatedItems.map((related) => (
                  <li key={related.id}>
                    <Link
                      to={`/library/${related.id}`}
                      className="block truncate text-sm text-text-primary hover:text-primary"
                    >
                      {parseTitle(related.title).title || related.summary || related.source_type}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This permanently removes the item, its summary, embedding, and any tags. This can't be undone."
      />
    </div>
  )
}

export default ItemDetail
