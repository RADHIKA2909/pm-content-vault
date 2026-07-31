import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api.js'
import { categoryColor } from '../lib/categoryColors.js'

const CATEGORIES = [
  'Interview Questions',
  'Job Postings',
  'Application Tips',
  'Frameworks',
  'Industry News',
  'Other',
]

const SOURCE_LABELS = {
  linkedin_paste: 'Pasted text',
  link: 'Link',
  image: 'Image',
  pdf: 'PDF',
  whatsapp_export: 'WhatsApp',
}

const REVIEW_TAG = 'review before mock'

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-3.5 w-full bg-slate-100 rounded mb-2" />
      <div className="h-3.5 w-2/3 bg-slate-100 rounded" />
    </div>
  )
}

function Dashboard() {
  const [items, setItems] = useState([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchItems = async () => {
    setLoading(true)
    setError(null)

    try {
      const url = new URL(`${API_URL}/api/items`)
      if (category) url.searchParams.set('category', category)

      const res = await fetch(url)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const handleEngage = async (id) => {
    await fetch(`${API_URL}/api/items/${id}/engage`, { method: 'PATCH' })
    fetchItems()
  }

  const handleMarkForReview = async (id) => {
    await fetch(`${API_URL}/api/items/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: REVIEW_TAG }),
    })
    fetchItems()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">Your saved items</h2>
          <p className="text-sm text-slate-500">{items.length} saved</p>
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2 mb-4">Error: {error}</p>
      )}

      {loading && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Nothing saved yet.</p>
          <p className="text-xs mt-1">Head to Ingest to save your first item.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {items.map((item) => {
          const isTaggedForReview = item.tags?.some((t) => t.tag === REVIEW_TAG)
          return (
            <li
              key={item.id}
              onClick={() => handleEngage(item.id)}
              className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <div className="flex flex-wrap items-center gap-1.5 text-xs mb-2">
                <span className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">
                  {SOURCE_LABELS[item.source_type] || item.source_type}
                </span>
                {item.category && (
                  <span className={`rounded-full px-2 py-0.5 font-medium ${categoryColor(item.category)}`}>
                    {item.category}
                  </span>
                )}
                {item.subcategory && (
                  <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                    {item.subcategory}
                  </span>
                )}
                {isTaggedForReview && (
                  <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-medium">
                    review before mock
                  </span>
                )}
                <span className="ml-auto text-slate-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-sm text-slate-800">
                {item.summary || <span className="text-slate-400 italic">summary pending...</span>}
              </p>

              {!isTaggedForReview && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleMarkForReview(item.id)
                  }}
                  className="mt-2.5 text-xs font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                >
                  Mark for review before mock
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Dashboard
