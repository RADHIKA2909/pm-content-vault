import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Bookmark, ExternalLink, ChevronDown } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { CategoryChip, DuplicateChip, Chip } from '../components/Chip.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'

const REVIEW_TAG = 'review before mock'

function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)

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

  const handleMarkReviewed = async () => {
    await fetch(`${API_URL}/api/items/${id}/engage`, { method: 'PATCH' })
    showToast('Marked as reviewed')
    fetchItem()
  }

  const handleMarkForReview = async () => {
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: REVIEW_TAG }),
    })
    showToast('Marked for review before mock')
    fetchItem()
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

  const isTaggedForReview = item.tags?.some((t) => t.tag === REVIEW_TAG)

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
              <Button variant="secondary" onClick={handleMarkReviewed}>
                <CheckCircle2 className="h-4 w-4" /> Mark Reviewed
              </Button>
              {!isTaggedForReview && (
                <Button variant="ghost" onClick={handleMarkForReview}>
                  <Bookmark className="h-4 w-4" /> Review before mock
                </Button>
              )}
            </div>
          </div>

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
                {item.source_type === 'link' ? (
                  <a
                    href={item.raw_content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {item.raw_content}
                  </a>
                ) : (
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
                      {related.summary || related.source_type}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

export default ItemDetail
