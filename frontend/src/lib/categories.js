// The fixed v0 taxonomy from CLAUDE.md. Mirrors CATEGORIES in
// backend/src/services/gemini.js, which is what the classifier is constrained
// to and what PATCH /api/items/:id validates against — keep the two in step.
export const CATEGORIES = [
  'Interview Questions',
  'Job Postings',
  'Application Tips',
  'Frameworks',
  'Industry News',
  'Other',
]

// An item carries one to three categories. Mirrors MAX_CATEGORIES in
// backend/src/routes/items.js, which enforces it on save.
export const MAX_CATEGORIES = 3

// The favourite star writes to the `tags` table. It's a control rather than a
// label, and is unrelated to categories.
export const FAVORITE_TAG = 'favorite'

/**
 * An item's categories as a plain array. Reads the item_categories rows, and
 * falls back to the single `category` column for anything saved before
 * categories became a list.
 */
export function itemCategories(item) {
  const list = (item?.item_categories || []).map((c) => c.category).filter(Boolean)
  if (list.length) return list
  return item?.category ? [item.category] : []
}
