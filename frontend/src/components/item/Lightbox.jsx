import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Copy, Download, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useToast } from '../ToastContext.jsx'

const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_SCALE = 2.5

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * Full-screen image viewer.
 *
 * Screenshots are a large share of what gets saved here — WhatsApp forwards,
 * slide photos, dense infographics — and they are unreadable at column width.
 * So this is a viewer rather than a preview: zoom, pan, and take the image
 * with you.
 */
function Lightbox({ src, onClose }) {
  const { showToast } = useToast()
  const reduceMotion = useReducedMotion()

  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)

  // Live pointer positions, keyed by pointerId. Two of them is a pinch.
  const pointers = useRef(new Map())
  const pinchStart = useRef(null)
  const panStart = useRef(null)

  const reset = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  useEffect(reset, [src, reset])

  useEffect(() => {
    if (!src) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === '0') reset()
      if (e.key === '+' || e.key === '=') setScale((s) => clamp(s * 1.4, MIN_SCALE, MAX_SCALE))
      if (e.key === '-') setScale((s) => clamp(s / 1.4, MIN_SCALE, MAX_SCALE))
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [src, onClose, reset])

  // Panning is only meaningful once the image is bigger than its frame, and
  // the offset has to be dropped when zooming back out or the image stays
  // stranded off-centre.
  const zoomTo = (next) => {
    const value = clamp(next, MIN_SCALE, MAX_SCALE)
    setScale(value)
    if (value === MIN_SCALE) setOffset({ x: 0, y: 0 })
  }

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture?.(e.pointerId)

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale }
    } else if (scale > 1) {
      panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }
    }
  }

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      return zoomTo(pinchStart.current.scale * (distance / pinchStart.current.distance))
    }

    if (panStart.current && scale > 1) {
      setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
    }
  }

  const endPointer = (e) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchStart.current = null
    if (pointers.current.size === 0) panStart.current = null
  }

  // ctrl+wheel is what a trackpad pinch arrives as on the desktop web.
  const onWheel = (e) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    zoomTo(scale * (e.deltaY < 0 ? 1.12 : 0.89))
  }

  const fetchBlob = async () => {
    const res = await fetch(src)
    if (!res.ok) throw new Error('fetch failed')
    return res.blob()
  }

  const copy = async () => {
    setBusy(true)
    try {
      const blob = await fetchBlob()

      // Clipboard image support is PNG-only in practice, so anything else gets
      // re-encoded. Decoding from the bytes we already fetched rather than
      // from the <img> keeps the canvas untainted.
      let item
      if (blob.type === 'image/png') {
        item = new ClipboardItem({ 'image/png': blob })
      } else {
        const bitmap = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext('2d').drawImage(bitmap, 0, 0)
        const png = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
        item = new ClipboardItem({ 'image/png': png })
      }

      await navigator.clipboard.write([item])
      showToast('Image copied')
    } catch {
      // Falling back to the URL rather than failing silently — it's the thing
      // the user can still paste somewhere useful.
      try {
        await navigator.clipboard.writeText(src)
        showToast('Copied the image link instead')
      } catch {
        showToast('Could not copy this image', 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    setBusy(true)
    try {
      const blob = await fetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = src.split('/').pop()?.split('?')[0] || 'image'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // A cross-origin download attribute is ignored, so opening the file is
      // the honest fallback rather than a link that silently does nothing.
      window.open(src, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  const ToolButton = ({ Icon, label, onClick, disabled }) => (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition-colors duration-150 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  )

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/80 p-6 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            // z-10 because the image's box can reach under this corner, and
            // whichever paints last wins the click — the toolbar was
            // unreachable on any image tall enough to fill the frame.
            className="absolute right-4 top-4 z-10 flex items-center gap-0.5 rounded-full bg-black/25 p-1 backdrop-blur-sm"
          >
            <ToolButton Icon={ZoomOut} label="Zoom out" onClick={() => zoomTo(scale / 1.4)} disabled={scale <= MIN_SCALE} />
            <span className="w-11 text-center text-[11px] tabular-nums text-white/80">
              {Math.round(scale * 100)}%
            </span>
            <ToolButton Icon={ZoomIn} label="Zoom in" onClick={() => zoomTo(scale * 1.4)} disabled={scale >= MAX_SCALE} />
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
            <ToolButton Icon={Copy} label="Copy image" onClick={copy} disabled={busy} />
            <ToolButton Icon={Download} label="Download image" onClick={download} disabled={busy} />
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/20" />
            <ToolButton Icon={X} label="Close image" onClick={onClose} />
          </div>

          {/* The entrance animation and the zoom transform must live on
              different elements. Framer writes its transform inline, so an
              animated <motion.img> silently discards the style.transform doing
              the zoom and pan — the percentage changed while the image sat
              perfectly still. */}
          <motion.div
            initial={reduceMotion ? false : { scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            // The wrapper's box is larger than the letterboxed image inside
            // it, so it must not swallow clicks — those belong to the backdrop,
            // which closes.
            className="pointer-events-none flex max-h-full max-w-full items-center justify-center overflow-hidden"
          >
            <img
              src={src}
              alt=""
              draggable={false}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={() => zoomTo(scale > 1 ? MIN_SCALE : DOUBLE_TAP_SCALE)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onWheel={onWheel}
              // touch-action none, or the browser's own pan/zoom takes the
              // gesture before the handlers above ever see it.
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                touchAction: 'none',
                cursor: scale > 1 ? 'grab' : 'zoom-in',
              }}
              className="pointer-events-auto max-h-full max-w-full select-none rounded-2xl object-contain shadow-card-hover transition-transform duration-150 ease-out"
            />
          </motion.div>

          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/25 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
            Double-click to zoom · drag to pan · Esc to close
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Lightbox
