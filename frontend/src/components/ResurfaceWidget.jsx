import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api.js'
import { SparkleIcon } from './icons.jsx'

function ResurfaceWidget() {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetch(`${API_URL}/api/resurface`)
      .then((res) => res.json())
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 mb-6">
      <div className="flex items-center gap-1.5 mb-2.5">
        <SparkleIcon className="h-3.5 w-3.5 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-900">Worth revisiting</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 5).map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm text-slate-700">
            {item.reason === 'tagged_for_review' && (
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide bg-amber-200 text-amber-800 rounded px-1.5 py-0.5">
                priority
              </span>
            )}
            <span>{item.summary || item.source_type}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ResurfaceWidget
