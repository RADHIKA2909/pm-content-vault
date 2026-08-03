import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api.js'
import { useToast } from '../components/ToastContext.jsx'
import { FAVORITE_TAG } from '../lib/categories.js'
import LibraryCard from '../components/LibraryCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'

function Favorites() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  const fetchItems = async () => {
    setLoading(true)
    const res = await fetch(`${API_URL}/api/items`)
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const favorites = useMemo(
    () => items.filter((item) => item.tags?.some((t) => t.tag === FAVORITE_TAG)),
    [items],
  )

  const handleToggleFavorite = async (id) => {
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: FAVORITE_TAG }),
    })
    showToast('Removed from favorites')
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
      <h1 className="text-[30px] font-semibold tracking-tight text-text-primary">Favorites</h1>
      <p className="mb-6 text-body text-text-secondary">{favorites.length} starred</p>

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && favorites.length === 0 && (
        <div className="py-16 text-center text-text-secondary">
          <p className="text-sm">Nothing starred yet.</p>
          <p className="mt-1 text-caption">Star an item in your Library to pin it here.</p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {favorites.map((item) => (
          <LibraryCard
            key={item.id}
            item={item}
            isFavorite
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

export default Favorites
