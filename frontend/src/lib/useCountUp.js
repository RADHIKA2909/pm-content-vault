import { useEffect, useRef, useState } from 'react'

const DURATION_MS = 700

// Ease-out: fast at first, settling gently — a linear count reads mechanical.
const easeOut = (t) => 1 - (1 - t) ** 3

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Counting up to "4h ago" isn't a thing. Without this guard the coercion
// below turns any non-numeric value into 0, so a metric showing a date would
// animate to a confident, wrong zero.
const isCountable = (value) => Number.isFinite(Number(value)) && value !== '' && value !== null

/**
 * Counts up to `value` once it's known, and again whenever it changes.
 *
 * Non-numeric values pass straight through — some metrics are a date or a
 * label rather than a quantity.
 *
 * Returns the target immediately when the user has asked for reduced motion,
 * so the number is still correct without animating.
 */
export function useCountUp(value) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)

  useEffect(() => {
    if (!isCountable(value)) {
      fromRef.current = value
      setDisplay(value)
      return undefined
    }

    const target = Number(value)
    const from = Number(fromRef.current) || 0

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
