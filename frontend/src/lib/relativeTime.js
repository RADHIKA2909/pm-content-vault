/**
 * Relative for anything recent, absolute once "40 days ago" stops being
 * easier to read than a date.
 *
 * Shared by the Library card and the duplicate warning in the Add Content
 * flow so "saved 2 weeks ago" means the same thing in both places.
 */
export function savedAgo(iso) {
  const date = new Date(iso)
  const mins = Math.round((Date.now() - date) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`

  const days = Math.round(mins / 1440)
  if (days <= 6) return `${days}d ago`
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
}

/**
 * The same instant in words rather than abbreviations — "2 weeks ago" instead
 * of "14d ago". Used where the phrasing sits inside a sentence.
 */
export function savedAgoLong(iso) {
  const date = new Date(iso)
  const days = Math.round((Date.now() - date) / 86400000)

  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  const weeks = Math.round(days / 7)
  if (days < 31) return weeks === 1 ? 'a week ago' : `${weeks} weeks ago`

  const months = Math.round(days / 30)
  if (days < 365) return months === 1 ? 'a month ago' : `${months} months ago`

  const years = Math.round(days / 365)
  return years === 1 ? 'a year ago' : `${years} years ago`
}
