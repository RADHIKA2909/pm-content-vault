import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bookmark, ExternalLink } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import Card from '../components/Card.jsx'
import { CategoryChip, DuplicateChip } from '../components/Chip.jsx'
import SourceBadge from '../components/SourceBadge.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'

const CATEGORIES = [
  'Interview Questions',
  'Job Postings',
  'Application Tips',
  'Frameworks',
  'Industry News',
  'Other',
]

const REVIEW_TAG = 'review before mock'

function Library() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const fetchItems = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/items`)
      if (!res.ok) throw new Error('Failed to load items')
      setItems(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const item of items) {
      if (item.category) counts[item.category] = (counts[item.category] || 0) + 1
    }
    return counts
  }, [items])

  const visibleItems = useMemo(() => {
    let result = items

    if (category) result = result.filter((item) => item.category === category)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.summary?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.raw_content?.toLowerCase().includes(q),
      )
    }

    return [...result].sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at),
    )
  }, [items, category, search, sort])

  const handleMarkForReview = async (e, id) => {
    e.stopPropagation()
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: REVIEW_TAG }),
    })
    showToast('Marked for review before mock')
    fetchItems()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-text-primary">Library</h1>
          <p className="text-body text-text-secondary">{items.length} saved</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <aside className="shrink-0 md:w-48">
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => setCategory('')}
              className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                category === '' ? 'bg-primary-light font-medium text-primary' : 'text-text-secondary hover:bg-muted'
              }`}
            >
              All items <span className="text-caption">{items.length}</span>
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                  category === c ? 'bg-primary-light font-medium text-primary' : 'text-text-secondary hover:bg-muted'
                }`}
              >
                {c} <span className="text-caption">{categoryCounts[c] || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search summaries, frameworks, companies..."
                className="w-full rounded-xl border border-border-subtle bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">Error: {error}</p>
          )}

          {loading && (
            <div className="flex flex-col gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {!loading && visibleItems.length === 0 && !error && (
            <div className="py-16 text-center text-text-secondary">
              <p className="text-sm">
                {items.length === 0 ? 'Start building your PM knowledge vault.' : 'No items match your search.'}
              </p>
            </div>
          )}

          <ul className="flex flex-col gap-3">
            {visibleItems.map((item) => {
              const isTaggedForReview = item.tags?.some((t) => t.tag === REVIEW_TAG)
              return (
                <Card
                  key={item.id}
                  as="li"
                  hover
                  onClick={() => navigate(`/library/${item.id}`)}
                  className="group"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <SourceBadge sourceType={item.source_type} />
                    <CategoryChip category={item.category} />
                    {isTaggedForReview && (
                      <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-caption font-medium text-warning">
                        review before mock
                      </span>
                    )}
                    {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
                    <span className="ml-auto text-caption text-text-secondary">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-body text-text-primary">
                    {item.summary || <span className="italic text-text-secondary">summary pending...</span>}
                  </p>

                  <div className="mt-3 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/library/${item.id}`)
                      }}
                      className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </button>
                    {!isTaggedForReview && (
                      <button
                        onClick={(e) => handleMarkForReview(e, item.id)}
                        className="flex items-center gap-1 text-caption font-medium text-text-secondary hover:text-primary"
                      >
                        <Bookmark className="h-3.5 w-3.5" /> Mark for review
                      </button>
                    )}
                  </div>
                </Card>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Library
