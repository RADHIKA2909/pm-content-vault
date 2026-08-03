import { useEffect, useState } from 'react'

// The honest condition is simply "taller than the screen": if you can see the
// whole thing at once there is nothing to be partway through, and a two-line
// note reporting "100% read" is noise pretending to be information. Anything
// stricter than 1 hides the indicator on articles that genuinely do scroll.
const MIN_SCROLLABLE = 1

/**
 * How far through the article you are, as a fraction.
 *
 * Measured against the content element rather than the page, so the summary,
 * notes and sidebar above and below it don't count as reading.
 * Returns null when the piece is too short for the question to mean anything.
 *
 * Takes the element itself rather than a ref, because the article isn't
 * mounted on the first render — the page is still a skeleton. A ref is a
 * stable object, so an effect keyed on it runs once against `null` and never
 * again; the element arriving is what has to re-run it.
 */
export function useReadingProgress(el) {
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const height = rect.height
      if (height < window.innerHeight * MIN_SCROLLABLE) return setProgress(null)

      // How much of the article has passed above the bottom of the viewport.
      const seen = window.innerHeight - rect.top
      setProgress(Math.min(Math.max(seen / height, 0), 1))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)

    // Images and late-rendered annotations change the height after mount, so
    // the first measurement alone would be wrong for exactly the long articles
    // this is for.
    const observer = new ResizeObserver(measure)
    observer.observe(el)

    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
      observer.disconnect()
    }
  }, [el])

  return progress
}

/**
 * A hairline that fills as you read.
 *
 * Sticky rather than fixed so it lines up with the content column without
 * having to know the sidebar's width, and full-bleed against the page gutters
 * so it reads as an edge of the page rather than an element on it.
 */
function ReadingProgress({ progress }) {
  if (progress === null) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none sticky top-0 z-20 -mx-4 -mt-5 mb-2 h-[3px] bg-transparent md:-mx-8 lg:-mx-10"
    >
      <div
        className="h-full rounded-r-full bg-primary/70 transition-[width] duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  )
}

export default ReadingProgress
