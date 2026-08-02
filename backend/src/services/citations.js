// The model writes citations both as "[1]" and grouped as "[1, 2]" — matching
// only the single form leaves grouped ones as plain text and their sources
// vanish from the Sources list.
const CITATION_MARKER = /\[(\d+(?:\s*,\s*\d+)*)\]/g

function parseGroup(group) {
  return group.split(',').map((n) => Number(n.trim()))
}

/**
 * Strips citation markers that don't point at a retrieved excerpt. The model
 * can only legitimately cite something it was given; anything outside that
 * range (most likely when nothing matched at all) would render as a citation
 * leading nowhere.
 */
export function sanitizeCitations(answer, excerptCount) {
  const isRetrieved = (n) => n >= 1 && n <= excerptCount

  return answer
    .replace(CITATION_MARKER, (marker, group) => {
      const valid = parseGroup(group).filter(isRetrieved)
      return valid.length ? `[${valid.join(', ')}]` : ''
    })
    .replace(/ {2,}/g, ' ')
    .replace(/ +([.,;:])/g, '$1') // tidy the gap a removed marker leaves behind
}

/**
 * The excerpt numbers actually referenced inline. Retrieval routinely returns
 * chunks the model correctly ignored, and those shouldn't show as sources.
 */
export function referencedIndexes(answer) {
  return new Set([...answer.matchAll(CITATION_MARKER)].flatMap((m) => parseGroup(m[1])))
}
