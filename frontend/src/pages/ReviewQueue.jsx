import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { CategoryChip } from '../components/Chip.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'

// Deterministic estimate from content length so cards show varied but
// reproducible times rather than a fabricated random number each render.
function estimateMinutes(summary) {
  const words = summary ? summary.split(/\s+/).length : 10
  return Math.min(5, Math.max(2, Math.round(words / 8)))
}

function ReviewQueue() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch(`${API_URL}/api/resurface`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleReview = async (id) => {
    await fetch(`${API_URL}/api/items/${id}/engage`, { method: 'PATCH' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    showToast('Nice — marked as reviewed')
  }

  return (
    <div>
      <h1 className="text-[30px] font-semibold tracking-tight text-text-primary">Review Queue</h1>
      <p className="mb-6 text-body text-text-secondary">{items.length} items to revisit</p>

      {loading && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="py-16 text-center text-text-secondary">
          <p className="text-sm">No items waiting for review.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.id} as="li">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <CategoryChip category={item.category} />
                  {item.reason === 'tagged_for_review' && (
                    <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-caption font-medium text-warning">
                      priority
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/library/${item.id}`)}
                  className="block w-full truncate text-left text-body text-text-primary hover:text-primary"
                >
                  {item.summary || item.source_type}
                </button>
                <p className="mt-1 text-caption text-text-secondary">
                  Saved {new Date(item.created_at).toLocaleDateString()} · Est. {estimateMinutes(item.summary)} min
                </p>
              </div>
              <Button variant="secondary" onClick={() => handleReview(item.id)}>
                <CheckCircle2 className="h-4 w-4" /> Review
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  )
}

export default ReviewQueue
