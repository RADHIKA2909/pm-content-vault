import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { API_URL } from '../../lib/api.js'

// Module-level so hovering the same link twice in a session costs nothing.
// A miss is a full server-side page fetch, which is far too expensive to
// repeat every time the pointer crosses a link.
const cache = new Map()

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Hover card for a link inside the content.
 *
 * Reuses the same /link/preview endpoint the Add Content flow uses, rather
 * than a second scraper that could disagree with it.
 */
function LinkPreview({ url, x, y }) {
  const [preview, setPreview] = useState(() => cache.get(url) || null)
  const [loading, setLoading] = useState(() => !cache.has(url))
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (cache.has(url)) {
      setPreview(cache.get(url))
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`${API_URL}/api/items/link/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        // A failed fetch is cached too — a page that won't render for the
        // server won't render on the next hover either.
        cache.set(url, data)
        if (cancelled) return
        setPreview(data)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return (
    // The centring lives on the outer element: Framer's inline transform would
    // replace a -translate-x-1/2 on the same node, leaving the card hanging off
    // the right of the link instead of under it.
    <div
      style={{ left: x, top: y }}
      className="pointer-events-none absolute z-20 -translate-x-1/2"
    >
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-surface shadow-card-hover ring-1 ring-border-subtle"
    >
      {preview?.imageUrl && (
        <img src={preview.imageUrl} alt="" className="h-[110px] w-full object-cover object-top" />
      )}
      <div className="p-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          {preview?.domain || domainOf(url)}
        </p>
        {loading ? (
          <p className="mt-1 text-caption text-text-secondary">Loading preview…</p>
        ) : preview ? (
          <>
            <p className="mt-0.5 line-clamp-2 text-caption font-semibold leading-snug text-text-primary">
              {preview.title || domainOf(url)}
            </p>
            {preview.description && (
              <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-text-secondary">
                {preview.description}
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-caption text-text-secondary">No preview available.</p>
        )}
      </div>
    </motion.div>
    </div>
  )
}

export default LinkPreview
