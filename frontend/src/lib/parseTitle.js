// items.title packs "Main Title::short subtitle" into one text column
// (no spare column for a separate field — see backend/enrichItem.js).
//
// The subtitle is capitalized on read as well as on write. New items arrive
// capitalized from the classifier, but everything saved before that rule
// existed is lowercase — correcting it here fixes those too, with no data
// migration. Only the first character changes, so "KPI trees" and "A/B
// testing" keep their own casing.
export function parseTitle(rawTitle) {
  if (!rawTitle) return { title: null, subtitle: null }
  const [title, subtitle] = rawTitle.split('::')
  const clean = (subtitle || '').trim()
  return {
    title,
    subtitle: clean ? clean[0].toUpperCase() + clean.slice(1) : null,
  }
}
