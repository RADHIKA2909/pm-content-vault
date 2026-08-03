import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  buildTextIndex,
  contextFor,
  offsetsFromRange,
  paint,
  resolveAll,
  segment,
  unpaint,
} from '../../lib/annotations.js'
import { structuredTextToHtml } from '../../lib/contentHtml.js'
import SelectionToolbar from './SelectionToolbar.jsx'
import HighlightNote from './HighlightNote.jsx'
import LinkPreview from './LinkPreview.jsx'

/**
 * The item's body as one HTML string.
 *
 * Every source type funnels through here so a single anchoring mechanism
 * covers all of them: annotation offsets index into the plain text of whatever
 * this returns.
 */
export function bodyHtml(item) {
  if (item.formatted_content) return item.formatted_content
  if (item.source_type === 'note') return item.raw_content || ''

  const text = item.extracted_text || ''
  if (!text) return ''

  // A link saved without a successful fetch stores its own URL as the body.
  // That's the link, not content — rendering it as an article is a lie. The
  // check is scoped to links on purpose: pasted text stores the same string in
  // both columns, and treating that as "no content" hid every pasted item.
  if (item.source_type === 'link' && text === item.raw_content) return ''

  return structuredTextToHtml(text)
}

// Clear of the text, and far enough that the toolbar doesn't cover the line
// you just selected.
const GAP = 10
const FLIP_THRESHOLD = 64

/**
 * The reading surface: imported content rendered read-only, with the
 * annotation layer drawn over it.
 *
 * The body is set through dangerouslySetInnerHTML and never edited. React only
 * touches that subtree when the HTML string itself changes, which is what makes
 * it safe to paint annotation spans into it directly — a repaint after every
 * commit restores anything React blew away.
 */
function ContentSurface({
  item,
  annotations = [],
  mode = 'annotate',
  onCreate,
  onUpdateNote,
  onColor,
  onDelete,
  onAskAi,
  onOrphans,
  onImageClick,
  focusAnnotationId,
}) {
  const wrapRef = useRef(null)
  const contentRef = useRef(null)
  const orphansRef = useRef(onOrphans)
  orphansRef.current = onOrphans

  const [selection, setSelection] = useState(null)
  const [composing, setComposing] = useState(false)
  const [active, setActive] = useState(null)
  const [linkPreview, setLinkPreview] = useState(null)

  const html = useMemo(() => bodyHtml(item), [item])

  // Wrapper-relative coordinates for anything anchored to a piece of text.
  const positionFor = useCallback((rect) => {
    const wrap = wrapRef.current?.getBoundingClientRect()
    if (!wrap) return { x: 0, y: 0, flip: false }

    // Flip is decided against the viewport, not the wrapper: what matters is
    // whether the toolbar would be drawn off the top of the window. Measured
    // against the wrapper, selecting the first line always flipped — pushing
    // the toolbar down over the line the user was reading next, with a screen
    // of empty space above it.
    const flip = rect.top < FLIP_THRESHOLD
    return {
      x: rect.left - wrap.left + rect.width / 2,
      y: flip ? rect.bottom - wrap.top + GAP : rect.top - wrap.top - GAP,
      flip,
    }
  }, [])

  const openAnnotation = useCallback(
    (group, span) => {
      setSelection(null)
      setComposing(false)
      setActive({ annotations: group, quote: span.textContent, ...positionFor(span.getBoundingClientRect()) })
    },
    [positionFor],
  )

  // ── Draw the annotation layer ──────────────────────────────────────────
  useLayoutEffect(() => {
    const container = contentRef.current
    if (!container) return

    unpaint(container)
    if (!annotations.length) {
      orphansRef.current?.([])
      return
    }

    const { text } = buildTextIndex(container)
    const { anchored, orphaned } = resolveAll(text, annotations)

    // Repaired offsets aren't written back. The repair is cheap and runs on
    // every render anyway, and a background write triggered by a read is a
    // good way to turn one bad anchor into a saved bad anchor.
    orphansRef.current?.(orphaned)
    paint(container, segment(anchored), { onSelectAnnotation: openAnnotation })

    return () => unpaint(container)
  }, [html, annotations, openAnnotation])

  // Jumping from the sidebar list to the text it refers to.
  useEffect(() => {
    if (!focusAnnotationId) return
    const span = contentRef.current?.querySelector(`[data-annotation-ids~="${focusAnnotationId}"]`)
    if (!span) return

    span.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // A ring rather than a colour change: the highlight's own colour is
    // information, and overwriting it to say "you are here" loses it.
    span.classList.add('ring-2', 'ring-primary', 'ring-offset-1')
    const timer = setTimeout(() => span.classList.remove('ring-2', 'ring-primary', 'ring-offset-1'), 1600)
    return () => clearTimeout(timer)
  }, [focusAnnotationId, annotations])

  // ── Selection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'annotate') {
      setSelection(null)
      return
    }

    const read = () => {
      const sel = window.getSelection()
      const container = contentRef.current
      if (!sel || sel.isCollapsed || !sel.rangeCount || !container) return setSelection(null)

      const range = sel.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) return setSelection(null)

      const index = buildTextIndex(container)
      const offsets = offsetsFromRange(index, range)
      if (!offsets) return setSelection(null)

      // A double-click takes the trailing space with it, and a drag past the
      // end of a line takes the newline. Storing those in the quote makes the
      // annotation harder to re-find later for no benefit.
      let { start, end } = offsets
      while (start < end && /\s/.test(index.text[start])) start += 1
      while (end > start && /\s/.test(index.text[end - 1])) end -= 1
      if (end <= start) return setSelection(null)

      setActive(null)
      setComposing(false)
      setSelection({
        start,
        end,
        ...contextFor(index.text, start, end),
        ...positionFor(range.getBoundingClientRect()),
      })
    }

    // mouseup on the document, not the container: a drag that ends past the
    // edge of the text still finishes a selection.
    document.addEventListener('mouseup', read)
    document.addEventListener('keyup', read)
    return () => {
      document.removeEventListener('mouseup', read)
      document.removeEventListener('keyup', read)
    }
  }, [mode, positionFor])

  const dismiss = useCallback(() => {
    setSelection(null)
    setComposing(false)
    setActive(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && dismiss()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss])

  // ── Actions ────────────────────────────────────────────────────────────
  const create = (fields) => {
    if (!selection) return
    const { start, end, quote, prefix, suffix } = selection
    onCreate({ startOffset: start, endOffset: end, quote, prefix, suffix, ...fields })
    dismiss()
  }

  const copySelection = async () => {
    try {
      await navigator.clipboard.writeText(selection.quote)
    } catch {
      /* Clipboard permission denied — nothing useful to recover here. */
    }
    dismiss()
  }

  const askAi = () => {
    onAskAi(selection)
    dismiss()
  }

  // ── Media and links ────────────────────────────────────────────────────
  const onContentClick = (e) => {
    const image = e.target.closest('img')
    if (image?.src) {
      e.preventDefault()
      return onImageClick?.(image.src)
    }
    // Clicking plain text closes whatever popover was open.
    if (!e.target.closest('.pmv-annotation')) setActive(null)
  }

  const hoverTimer = useRef(null)

  const onContentMouseOver = (e) => {
    const link = e.target.closest('a[href^="http"]')
    clearTimeout(hoverTimer.current)
    if (!link) return

    // Delayed so that merely reading past a link doesn't fire a fetch.
    hoverTimer.current = setTimeout(() => {
      const wrap = wrapRef.current?.getBoundingClientRect()
      if (!wrap) return
      const rect = link.getBoundingClientRect()
      setLinkPreview({
        url: link.href,
        x: rect.left - wrap.left + rect.width / 2,
        y: rect.bottom - wrap.top + 8,
      })
    }, 450)
  }

  const onContentMouseLeave = () => {
    clearTimeout(hoverTimer.current)
    setLinkPreview(null)
  }

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  if (!html) return null

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={contentRef}
        onClick={onContentClick}
        onMouseOver={onContentMouseOver}
        onMouseLeave={onContentMouseLeave}
        // Content is source, not a document to type into. Every mark the user
        // makes lives in the annotations table instead.
        //
        // The measure is set in ch and deliberately tight: 68ch rendered at
        // ~86 characters a line, well past the ~66 where the eye starts losing
        // its place on the return sweep. This lands near 70.
        //
        // Centred, because a narrow column pinned left inside a wide card
        // reads as a layout that failed rather than a column that was chosen.
        className="note-body reading-body mx-auto max-w-[56ch] text-text-primary"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <AnimatePresence>
        {selection && !composing && (
          <SelectionToolbar
            key="toolbar"
            x={selection.x}
            y={selection.y}
            flip={selection.flip}
            onHighlight={(color) => create({ type: 'highlight', color })}
            onFormat={(type) => create({ type })}
            onNote={() => setComposing(true)}
            onAi={askAi}
            onCopy={copySelection}
          />
        )}

        {selection && composing && (
          <HighlightNote
            key="compose"
            mode="compose"
            x={selection.x}
            y={selection.y}
            flip={selection.flip}
            quote={selection.quote}
            onSave={(note) => create({ type: 'note', note })}
            onClose={dismiss}
          />
        )}

        {active && (
          <HighlightNote
            key="view"
            mode="view"
            x={active.x}
            y={active.y}
            flip={active.flip}
            quote={active.quote}
            annotations={active.annotations}
            onUpdateNote={onUpdateNote}
            onColor={onColor}
            onDelete={(annotation) => {
              onDelete(annotation)
              setActive(null)
            }}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>

      {linkPreview && <LinkPreview {...linkPreview} />}
    </div>
  )
}

export default ContentSurface
