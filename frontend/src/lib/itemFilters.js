// Pure filter/sort helpers for the Library. Kept out of the page component so
// the matching rules can be reasoned about (and tested) on their own.
import { FAVORITE_TAG, itemCategories } from './categories.js'

// One control, not two. `source_type` is a single column, so a separate
// "content type" dropdown would be a second view of the same field — two
// controls that can contradict each other and mean nothing when they do.
//
// `link` rows carry a `link_type`, which is the one real sub-distinction:
// a LinkedIn post saved by URL should file under LinkedIn, not "Web link".
export const SOURCE_FILTERS = [
  { value: '', label: 'All sources' },
  { value: 'linkedin', label: 'LinkedIn', match: (i) => i.source_type === 'linkedin_paste' || (i.source_type === 'link' && i.link_type === 'linkedin') },
  { value: 'link', label: 'Web link', match: (i) => i.source_type === 'link' && i.link_type !== 'linkedin' },
  { value: 'pdf', label: 'PDF', match: (i) => i.source_type === 'pdf' },
  { value: 'image', label: 'Image', match: (i) => i.source_type === 'image' },
  // One entry, because Note and "Paste text" merged into a single input type.
  // `text` rows predate that merge and are shown as notes everywhere else, so
  // a separate filter here would hide half of what the user thinks of as their
  // notes depending on which option they picked.
  { value: 'note', label: 'My notes', match: (i) => i.source_type === 'note' || i.source_type === 'text' },
  { value: 'whatsapp_export', label: 'WhatsApp', match: (i) => i.source_type === 'whatsapp_export' },
]

export const DATE_RANGES = [
  { value: '', label: 'Any time' },
  { value: 'today', label: 'Today', days: 1 },
  { value: 'week', label: 'Past 7 days', days: 7 },
  { value: 'month', label: 'Past 30 days', days: 30 },
  { value: 'quarter', label: 'Past 3 months', days: 90 },
]

export const DUPLICATE_FILTERS = [
  { value: '', label: 'All items' },
  { value: 'only', label: 'Possible duplicates' },
  { value: 'hide', label: 'Hide duplicates' },
]

// Archived items are out of the Library by default — that's what archiving is
// for. This is the way back to them without having to remember which ones you
// put away.
export const ARCHIVED_FILTERS = [
  { value: '', label: 'Hide archived' },
  { value: 'include', label: 'Include archived' },
  { value: 'only', label: 'Archived only' },
]

// Applied before search and the rest of the filters, because it decides what
// counts as being in the Library at all — the "N items" total has to agree
// with it.
export function scopeByArchived(items, archived) {
  if (archived === 'only') return items.filter((i) => i.archived_at)
  if (archived === 'include') return items
  return items.filter((i) => !i.archived_at)
}

export const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'az', label: 'Title A–Z' },
  { value: 'za', label: 'Title Z–A' },
]

// Favorites sorts by when you starred something and when you last opened it,
// neither of which the Library offers — on this page "recent" means recently
// singled out, not recently saved.
export const FAVORITE_SORTS = [
  { value: 'starred', label: 'Recently starred' },
  { value: 'opened', label: 'Recently opened' },
  { value: 'az', label: 'Alphabetical' },
  { value: 'oldest', label: 'Oldest first' },
]

/**
 * When an item was starred — the `favorite` tag's own created_at.
 *
 * The list endpoint has returned this all along (`tags(tag, created_at)`) and
 * nothing has ever read it. It's what makes "Starred 4h ago" and the whole
 * recently-starred sort possible without a schema change.
 */
export function starredAt(item) {
  return item.tags?.find((t) => t.tag === FAVORITE_TAG)?.created_at || null
}

export const DEFAULT_FILTERS = { source: '', date: '', duplicates: '', archived: '', favoritesOnly: false }

export const activeFilterCount = (f) =>
  [f.source, f.date, f.duplicates, f.archived].filter(Boolean).length + (f.favoritesOnly ? 1 : 0)

const isFavorite = (item) => Boolean(item.tags?.some((t) => t.tag === FAVORITE_TAG))

// Search deliberately spans title, summary, categories AND the raw content, so
// half-remembered phrasing still finds the item — the whole reason this app
// uses retrieval rather than folders.
function matchesSearch(item, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return Boolean(
    item.title?.toLowerCase().includes(q) ||
      item.summary?.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q) ||
      itemCategories(item).some((c) => c.toLowerCase().includes(q)) ||
      item.raw_content?.toLowerCase().includes(q),
  )
}

export function filterItems(items, { search = '', category = '', filters = DEFAULT_FILTERS }) {
  const source = SOURCE_FILTERS.find((s) => s.value === filters.source && s.match)
  const range = DATE_RANGES.find((d) => d.value === filters.date && d.days)
  const cutoff = range ? Date.now() - range.days * 86400000 : null

  return items.filter((item) => {
    if (category && !itemCategories(item).includes(category)) return false
    if (source && !source.match(item)) return false
    if (cutoff !== null && new Date(item.created_at).getTime() < cutoff) return false
    if (filters.duplicates === 'only' && !item.duplicateOf) return false
    if (filters.duplicates === 'hide' && item.duplicateOf) return false
    if (filters.favoritesOnly && !isFavorite(item)) return false
    return matchesSearch(item, search)
  })
}

// The sort key follows the same fallback chain the card uses for its headline
// (title, then summary, then raw content). Sorting on `title` alone would file
// an untitled item under nothing while the card visibly reads "check2" —
// A–Z has to agree with what's printed on the card.
//
// Anything with no text at all still sorts last rather than clustering at the
// top under an empty string.
export function sortItems(items, sort) {
  const byDate = (a, b) => new Date(b.created_at) - new Date(a.created_at)

  return [...items].sort((a, b) => {
    if (sort === 'oldest') return -byDate(a, b)
    if (sort === 'az' || sort === 'za') {
      const [ta, tb] = [titleOf(a), titleOf(b)]
      if (!ta && !tb) return byDate(a, b)
      if (!ta) return 1
      if (!tb) return -1
      return sort === 'az' ? ta.localeCompare(tb) : tb.localeCompare(ta)
    }
    return byDate(a, b)
  })
}

// The same fallback chain the card prints, so an alphabetical sort agrees with
// what's actually on screen. Shared with sortItems above for that reason.
const titleOf = (item) =>
  (item.title || item.summary || item.raw_content || '').split('::')[0].trim().toLowerCase()

/**
 * Sorting for the Favorites page.
 *
 * `opened` falls back to the save date for anything never opened — sorting
 * those to the very bottom would bury a brand-new favourite you starred a
 * minute ago simply because you haven't clicked into it yet.
 */
export function sortFavorites(items, sort) {
  const time = (value) => (value ? new Date(value).getTime() : 0)

  return [...items].sort((a, b) => {
    if (sort === 'opened') {
      return time(b.last_engaged_at || b.created_at) - time(a.last_engaged_at || a.created_at)
    }
    if (sort === 'oldest') return time(a.created_at) - time(b.created_at)
    if (sort === 'az') {
      const [ta, tb] = [titleOf(a), titleOf(b)]
      if (!ta && !tb) return 0
      if (!ta) return 1
      if (!tb) return -1
      return ta.localeCompare(tb)
    }
    // Recently starred, the default.
    return time(starredAt(b)) - time(starredAt(a))
  })
}

// A copyable source URL, or null when the item simply doesn't have one —
// pasted text and hand-written notes never do, so the menu entry is omitted
// for them rather than copying something misleading.
export function sourceUrl(item) {
  if (item.source_type === 'link') return item.raw_content?.trim() || null
  if (item.file_url && (item.source_type === 'pdf' || item.source_type === 'image')) return item.file_url
  return null
}
