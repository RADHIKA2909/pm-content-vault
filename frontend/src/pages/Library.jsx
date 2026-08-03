import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import LibraryCard from '../components/LibraryCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import CategoryFilterBar from '../components/CategoryFilterBar.jsx'
import { FAVORITE_TAG, itemCategories } from '../lib/categories.js'


function Library() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
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

  // Keyed on location.key so arriving here refetches every time — including
  // when a save navigates to Library from Library, which doesn't remount the
  // page and so would otherwise show a stale list until a manual refresh.
  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const item of items) {
      for (const c of itemCategories(item)) counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [items])

  const visibleItems = useMemo(() => {
    let result = items

    if (category) result = result.filter((item) => itemCategories(item).includes(category))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.summary?.toLowerCase().includes(q) ||
          itemCategories(item).some((c) => c.toLowerCase().includes(q)) ||
          item.raw_content?.toLowerCase().includes(q),
      )
    }

    return [...result].sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at),
    )
  }, [items, category, search, sort])

  const handleToggleFavorite = async (id, isFavorite) => {
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: isFavorite ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: FAVORITE_TAG }),
    })
    showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    fetchItems()
  }

  const handleDelete = async () => {
    const id = pendingDeleteId
    await fetch(`${API_URL}/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    showToast('Item deleted')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[30px] font-semibold tracking-tight text-text-primary">Library</h1>
          <p className="text-body text-text-secondary">{items.length} saved</p>
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your vault — content, summaries, categories..."
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

      <div className="mb-5">
        <CategoryFilterBar
          counts={categoryCounts}
          total={items.length}
          selected={category}
          onSelect={setCategory}
          query={search}
        />
      </div>

      {error && <p className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">Error: {error}</p>}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <SkeletonCard />
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

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {visibleItems.map((item) => (
          <LibraryCard
            key={item.id}
            item={item}
            isFavorite={item.tags?.some((t) => t.tag === FAVORITE_TAG)}
            onOpen={(id) => navigate(`/library/${id}`)}
            onToggleFavorite={handleToggleFavorite}
            onDelete={(id) => setPendingDeleteId(id)}
          />
        ))}
      </ul>

      <ConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This permanently removes the item, its summary, embedding, and any tags. This can't be undone."
      />
    </div>
  )
}

export default Library
