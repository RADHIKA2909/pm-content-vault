import { parseTitle } from './parseTitle.js'
import { savedAgo } from './relativeTime.js'

/**
 * What a Library card should say about an item.
 *
 * One descriptor rather than seven card components: a new content type is an
 * entry in KINDS below, not a new file that has to re-implement hover, the
 * overflow menu, selection and the favourite button.
 *
 * Every field is dropped when its value is missing. A PDF with no highlights
 * shows its save date instead of "0 highlights"; a job with no salary just
 * omits it. Nothing here invents a number.
 */

// Average adult reading speed for non-fiction. Rounded up, so a short note
// reads "1 min" rather than "0 min".
const WORDS_PER_MINUTE = 220

export function readTime(item) {
  if (!item.word_count) return null
  return `${Math.max(1, Math.round(item.word_count / WORDS_PER_MINUTE))} min read`
}

export function domainOf(item) {
  if (item.source_type !== 'link' || !item.raw_content) return null
  try {
    return new URL(item.raw_content).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

// Written out in full — Tailwind scans source text, so a class assembled from
// a variable never reaches the compiled CSS.
const TONES = [
  { tile: 'bg-primary-light text-primary', field: 'bg-primary/[0.06]' },
  { tile: 'bg-secondary/15 text-secondary', field: 'bg-secondary/[0.06]' },
  { tile: 'bg-accent-light text-accent', field: 'bg-accent/[0.06]' },
  { tile: 'bg-warning/15 text-warning', field: 'bg-warning/[0.06]' },
  { tile: 'bg-success/15 text-success', field: 'bg-success/[0.06]' },
]

/**
 * A stable colour per domain, so techcrunch.com is always the same tone and
 * the grid becomes scannable by source without a fetched favicon — which
 * would mean telling a third party every domain in the vault.
 */
export function monogramTone(seed) {
  const text = seed || ''
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 997
  return TONES[hash % TONES.length]
}

// Which visual identity an item gets. `link` splits on link_type because a
// LinkedIn post and a blog article read very differently.
function kindOf(item) {
  if (item.source_type === 'link') return item.link_type === 'linkedin' ? 'linkedin' : 'article'
  if (item.source_type === 'linkedin_paste') return 'linkedin'
  // An imported chat message is from WhatsApp before it is anything else —
  // it used to fall through to the generic text tile and show a bare "T".
  if (item.source_type === 'whatsapp_export') return 'whatsapp'
  // 'text' rows predate the merge of Note and Paste text. They render as notes
  // rather than being migrated: the distinction no longer exists in the UI, so
  // showing it on old cards would be showing a difference the user can't make.
  if (item.source_type === 'text') return 'note'
  if (['pdf', 'image', 'note', 'job', 'question'].includes(item.source_type)) return item.source_type
  return 'note'
}

const KIND_LABEL = {
  article: 'Website',
  linkedin: 'LinkedIn',
  pdf: 'PDF',
  image: 'Image',
  note: 'Note',
  job: 'Job posting',
  question: 'Interview Q',
  whatsapp: 'WhatsApp',
  // Same label as a written note — see kindOf above.
  text: 'Note',
  whatsapp_export: 'WhatsApp',
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export function describeItem(item) {
  const kind = kindOf(item)
  const { title, subtitle } = parseTitle(item.title)
  const domain = domainOf(item)

  // The badge that sits on the hero. For an article it's the domain, because
  // where something came from is the fastest way to recognise it.
  const badge = kind === 'article' && domain ? domain : KIND_LABEL[item.source_type] || KIND_LABEL[kind]

  const meta = []
  const footer = []

  // The type label goes in the badge on the hero, so the row beneath carries
  // only what the badge doesn't already say. Otherwise a note card reads
  // "My note" twice within 40px of itself.
  if (kind === 'article') meta.push(KIND_LABEL.article)

  if (kind === 'article' || kind === 'linkedin' || kind === 'whatsapp') {
    if (kind === 'linkedin' && item.author) meta.push(item.author)
    // Usually absent on a chat message — one line of WhatsApp is nowhere near
    // a minute — and absent metrics are dropped, so nothing renders.
    if (readTime(item)) meta.push(readTime(item))
  }

  if (kind === 'pdf') {
    if (item.page_count) meta.push(plural(item.page_count, 'page'))
    if (readTime(item)) meta.push(readTime(item))
  }

  // extracted_text on an image is OCR output — the only honest signal we have
  // that the picture's words are searchable.
  if (kind === 'image' && item.word_count) meta.push('Text extracted')

  if (kind === 'note' && item.word_count) meta.push(plural(item.word_count, 'word'))

  if (kind === 'job') {
    if (item.company) meta.push(item.company)
    if (item.salary) meta.push(item.salary)
    if (!meta.length) meta.push('Job posting')
  }

  if (kind === 'question') {
    meta.push(item.subcategory || 'Interview question')
  }

  // Footer: the most useful thing known about this item's state. Highlights
  // beat a save date, because a marked-up item is one you've worked with.
  if (item.highlight_count) footer.push({ icon: 'highlight', text: plural(item.highlight_count, 'highlight') })
  else if (kind === 'job' && item.deadline)
    footer.push({ icon: 'deadline', text: `Closes ${new Date(item.deadline).toLocaleDateString()}` })
  else footer.push({ icon: 'saved', text: `Saved ${savedAgo(item.created_at)}` })

  return {
    kind,
    badge,
    domain,
    // Whether the hero will show a real picture rather than something we drew.
    // Only those need a scrim behind the badges: a saved image or an og:image
    // often has its own text along the top edge, which collides with the type
    // badge and reads as one jumbled line. A generated cover, monogram or note
    // page leaves that corner clear by construction, and dimming it would only
    // muddy the tint. Kept here because this module already owns every
    // type-specific decision — CardHero and the card shell agreeing separately
    // is how the two drift apart.
    hasArtwork:
      ['pdf', 'image', 'linkedin', 'article'].includes(kind) &&
      Boolean(item.thumbnail_url || item.file_url),
    title: title || item.summary || item.raw_content || 'Untitled',
    subtitle: title ? subtitle : null,
    meta,
    footer,
    // Both straight from stored timestamps — no separate "new" flag to drift.
    isNew: Date.now() - new Date(item.created_at) < 86400000,
    // Deliberately excludes items saved in the last day. "Opened recently" is
    // trivially true of anything just saved, and a flag that's true of every
    // card tells you nothing — the interesting case is an older item you came
    // back to.
    revisited:
      Boolean(item.last_engaged_at) &&
      Date.now() - new Date(item.created_at) > 86400000 &&
      Date.now() - new Date(item.last_engaged_at) < 2 * 86400000,
  }
}
