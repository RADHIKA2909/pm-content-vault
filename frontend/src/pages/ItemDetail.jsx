import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, ExternalLink, ChevronDown, Trash2, Copy } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { CategoryChip, DuplicateChip, Chip } from '../components/Chip.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import { FAVORITE_TAG } from './Library.jsx'

function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const engagedIdRef = useRef(null)

  const fetchItem = async () => {
    setLoading(true)
    const res = await fetch(`${API_URL}/api/items/${id}`)
    if (res.ok) setItem(await res.json())
    setLoading(false)
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
    fetchItem()
  }

  const handleDelete = async () => {
    await fetch(`${API_URL}/api/items/${id}`, { method: 'DELETE' })
    showToast('Item deleted')
    navigate('/library')
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
              <SourceBadge sourceType={item.source_type} />
              <CategoryChip category={item.category} />
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

          {item.duplicateOf && (
            <Card className="mb-4 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <Copy className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    This looks like a duplicate ({Math.round(item.duplicateOf.similarity * 100)}% match)
                  </p>
                  <p className="mt-1 truncate text-sm text-text-secondary">
                    Possibly the same as: {item.duplicateOf.title || item.duplicateOf.summary || 'another saved item'}
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

          <Card className="mb-4">
            <p className="mb-2 text-caption font-medium uppercase tracking-wide text-text-secondary">
              AI Summary
            </p>
            <p className="text-body text-text-primary">
              {item.summary || <span className="italic text-text-secondary">summary pending...</span>}
            </p>
          </Card>

          <Card>
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="text-caption font-medium uppercase tracking-wide text-text-secondary">
                Original Content
              </p>
              <ChevronDown
                className={`h-4 w-4 text-text-secondary transition-transform ${showOriginal ? 'rotate-180' : ''}`}
              />
            </button>

            {showOriginal && (
              <div className="mt-3">
                {item.source_type === 'link' && (
                  <a
                    href={item.raw_content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {item.raw_content}
                  </a>
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
                    {item.extracted_text && (
                      <p className="whitespace-pre-wrap text-sm text-text-secondary">{item.extracted_text}</p>
                    )}
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

                {(item.source_type === 'linkedin_paste' || item.source_type === 'whatsapp_export') && (
                  <p className="whitespace-pre-wrap text-sm text-text-secondary">
                    {item.extracted_text || item.raw_content || 'No content stored.'}
                  </p>
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
                  <SourceBadge sourceType={item.source_type} />
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
                      {related.title || related.summary || related.source_type}
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
