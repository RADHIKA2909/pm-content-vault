import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 700

// Ease-out: fast at first, settling gently — a linear count reads mechanical.
const easeOut = (t) => 1 - (1 - t) ** 3

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Counts up to `value` once it's known, and again whenever it changes.
 *
 * Returns the target immediately when the user has asked for reduced motion,
 * so the number is still correct without animating.
 */
export function useCountUp(value) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    const target = Number(value) || 0
    const from = fromRef.current

    if (from === target) return undefined

    if (prefersReducedMotion()) {
      fromRef.current = target
      setDisplay(target)
      return undefined
    }

    let frame
    const start = performance.now()

    const tick = (now) => {
      const progress = Math.min((now - start) / DURATION_MS, 1)
      setDisplay(Math.round(from + (target - from) * easeOut(progress)))

      if (progress < 1) frame = requestAnimationFrame(tick)
      else fromRef.current = target
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])

  return display
}
