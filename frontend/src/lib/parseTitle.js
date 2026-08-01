// items.title packs "Main Title::short subtitle" into one text column
// (no spare column for a separate field — see backend/enrichItem.js).
export function parseTitle(rawTitle) {
  if (!rawTitle) return { title: null, subtitle: null }
  const [title, subtitle] = rawTitle.split('::')
  return { title, subtitle: subtitle || null }
}
