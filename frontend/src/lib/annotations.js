/**
 * Anchoring for the reading workspace.
 *
 * Annotations are stored against character offsets into the plain text of the
 * rendered body, never by rewriting the body itself. Offsets alone are
 * brittle — a single edit upstream shifts every annotation onto the wrong
 * words, silently — so each one also carries the exact quote and a little
 * surrounding context, and is verified (and repaired) before it is drawn.
 */

// Enough context to disambiguate a quote that appears more than once, without
// storing so much that ordinary editing invalidates it.
export const CONTEXT_LENGTH = 24

export const HIGHLIGHT_COLORS = ['yellow', 'green', 'purple', 'blue']

// Written out in full: Tailwind scans source text, so a class assembled at
// runtime never reaches the compiled CSS.
export const HIGHLIGHT_CLASS = {
  yellow: 'bg-amber-200/55',
  green: 'bg-emerald-200/55',
  purple: 'bg-violet-200/55',
  blue: 'bg-sky-200/55',
}

export const HIGHLIGHT_SWATCH = {
  yellow: 'bg-amber-300',
  green: 'bg-emerald-300',
  purple: 'bg-violet-300',
  blue: 'bg-sky-300',
}

const FORMAT_CLASS = {
  bold: 'font-semibold',
  italic: 'italic',
  underline: 'underline decoration-2 underline-offset-2',
  strikethrough: 'line-through decoration-2',
  important: 'bg-warning/20 font-medium',
  question: 'bg-primary/15',
  note: 'border-b-2 border-dashed border-primary/60',
}

/** Every class an annotated span should carry, given the annotations on it. */
export function classesFor(annotations) {
  const classes = new Set()
  for (const a of annotations) {
    if (a.type === 'highlight') classes.add(HIGHLIGHT_CLASS[a.color] || HIGHLIGHT_CLASS.yellow)
    else if (FORMAT_CLASS[a.type]) classes.add(FORMAT_CLASS[a.type])
    // A note gets both the dashed underline and a marker glyph (see
    // .pmv-noted in index.css). The underline alone said "something is here";
    // the marker says the something is a note you wrote.
    if (a.note) {
      classes.add('border-b-2 border-dashed border-primary/60')
      classes.add('pmv-noted')
    }
  }
  return [...classes].join(' ')
}

// ── Text index ───────────────────────────────────────────────────────────

/**
 * Flattens a container's text nodes into one string plus a lookup from
 * offset back to node. DOM-dependent, but the only place that touches the DOM
 * for reading.
 */
export function buildTextIndex(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes = []
  let text = ''
  let node

  while ((node = walker.nextNode())) {
    const value = node.nodeValue || ''
    if (!value) continue
    nodes.push({ node, start: text.length, end: text.length + value.length })
    text += value
  }

  return { text, nodes }
}

/** Plain-text offsets for a live DOM selection range, or null if unusable. */
export function offsetsFromRange(index, range) {
  const positionOf = (container, offset, isEnd) => {
    if (container.nodeType === Node.TEXT_NODE) {
      const entry = index.nodes.find((n) => n.node === container)
      return entry ? entry.start + offset : null
    }

    // An element container's offset is a child index, not a character index.
    const child = container.childNodes[offset]
    if (child) {
      const entry = index.nodes.find((n) => n.node === child || child.contains?.(n.node))
      if (entry) return entry.start
    }

    // Past the last child: fall back to the end of the text it contains.
    const contained = index.nodes.filter((n) => container.contains(n.node))
    if (!contained.length) return null
    return isEnd ? contained[contained.length - 1].end : contained[0].start
  }

  const start = positionOf(range.startContainer, range.startOffset, false)
  const end = positionOf(range.endContainer, range.endOffset, true)
  if (start === null || end === null || end <= start) return null
  return { start, end }
}

/** The quote and surrounding context to store alongside the offsets. */
export function contextFor(text, start, end) {
  return {
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
    suffix: text.slice(end, end + CONTEXT_LENGTH),
  }
}

// ── Anchoring and repair ─────────────────────────────────────────────────

/**
 * Where an annotation actually belongs in the current text.
 *
 * Returns `{ start, end, repaired }`, or null when the quote can no longer be
 * found at all — the caller surfaces those as orphaned rather than dropping
 * them, because a highlight that disappears with no explanation is worse than
 * one that says it lost its place.
 */
export function anchor(text, annotation) {
  const { start_offset: start, end_offset: end, quote, prefix = '', suffix = '' } = annotation
  if (!quote) return null

  // The common case: nothing moved.
  if (text.slice(start, end) === quote) return { start, end, repaired: false }

  // Context-qualified search, which survives an identical quote appearing
  // elsewhere in the document.
  if (prefix || suffix) {
    const withContext = prefix + quote + suffix
    const found = text.indexOf(withContext)
    if (found !== -1) {
      const repairedStart = found + prefix.length
      return { start: repairedStart, end: repairedStart + quote.length, repaired: true }
    }
  }

  // Quote alone. When it occurs more than once, take the occurrence nearest
  // the original offset — text usually shifts rather than reshuffles.
  const occurrences = []
  let at = text.indexOf(quote)
  while (at !== -1) {
    occurrences.push(at)
    at = text.indexOf(quote, at + 1)
  }
  if (occurrences.length) {
    const best = occurrences.reduce((a, b) => (Math.abs(a - start) <= Math.abs(b - start) ? a : b))
    return { start: best, end: best + quote.length, repaired: true }
  }

  return null
}

/** Splits annotations into anchored ones (with resolved offsets) and orphans. */
export function resolveAll(text, annotations) {
  const anchored = []
  const orphaned = []

  for (const annotation of annotations) {
    const position = anchor(text, annotation)
    if (position) anchored.push({ ...annotation, ...position })
    else orphaned.push(annotation)
  }

  return { anchored, orphaned }
}

// ── Segmentation ─────────────────────────────────────────────────────────

/**
 * Turns overlapping annotations into a flat run of non-overlapping segments,
 * each carrying every annotation covering it.
 *
 * Without this, a bolded phrase inside a highlight would need nested wrappers
 * whose boundaries don't line up — which is what produces mangled markup.
 */
export function segment(anchored) {
  if (!anchored.length) return []

  const boundaries = [...new Set(anchored.flatMap((a) => [a.start, a.end]))].sort((a, b) => a - b)
  const segments = []

  for (let i = 0; i < boundaries.length - 1; i += 1) {
    const start = boundaries[i]
    const end = boundaries[i + 1]
    const covering = anchored.filter((a) => a.start <= start && a.end >= end)
    if (covering.length) segments.push({ start, end, annotations: covering })
  }

  return segments
}

// ── Painting ─────────────────────────────────────────────────────────────

/**
 * Wraps one offset range in spans built by `makeSpan`.
 *
 * Works per text node rather than using `Range.surroundContents`, which throws
 * whenever a selection crosses an element boundary — which is most of the time
 * on real content. Text nodes are processed back to front so that splitting one
 * never invalidates the recorded offsets of those before it.
 */
function paintRange(index, start, end, makeSpan) {
  const parts = index.nodes.filter((n) => n.end > start && n.start < end)

  for (const part of [...parts].reverse()) {
    const from = Math.max(start, part.start) - part.start
    const to = Math.min(end, part.end) - part.start

    let node = part.node
    if (!node.parentNode) continue
    if (to < node.nodeValue.length) node.splitText(to)
    if (from > 0) node = node.splitText(from)

    const span = makeSpan()
    node.parentNode.insertBefore(span, node)
    span.appendChild(node)
  }
}

/**
 * Draws every segment into the container.
 *
 * Segments are painted back to front for the same reason as the text nodes
 * within them: splitting later text never disturbs the offsets of earlier
 * text, so a single index stays valid for the whole pass.
 */
export function paint(container, segments, { onSelectAnnotation } = {}) {
  const index = buildTextIndex(container)

  for (const seg of [...segments].reverse()) {
    paintRange(index, seg.start, seg.end, () => {
      const span = document.createElement('span')
      span.className = `pmv-annotation rounded-[3px] transition-colors duration-200 ${classesFor(seg.annotations)}`
      span.dataset.annotationIds = seg.annotations.map((a) => a.id).join(',')

      const withNote = seg.annotations.find((a) => a.note)
      if (withNote) span.dataset.note = withNote.note

      span.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectAnnotation?.(seg.annotations, span)
      })

      return span
    })
  }
}

/** Removes previously painted spans, restoring the body to plain content. */
export function unpaint(container) {
  for (const span of container.querySelectorAll('.pmv-annotation')) {
    const parent = span.parentNode
    while (span.firstChild) parent.insertBefore(span.firstChild, span)
    parent.removeChild(span)
  }
  container.normalize()
}
