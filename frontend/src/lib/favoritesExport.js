import { API_URL } from './api.js'
import { itemCategories } from './categories.js'
import { parseTitle } from './parseTitle.js'
import { sourceUrl } from './itemFilters.js'

/**
 * Exports chosen favourites as one Markdown file.
 *
 * Markdown rather than PDF or JSON: it opens in Notion, Obsidian, a text
 * editor or a phone, and it stays readable when the app isn't around — which
 * is the only reason to export at all.
 *
 * Key points live on `GET /api/items/:id` and not on the list payload, so the
 * detail for each selected item is fetched. They're the part of a saved item
 * worth carrying into revision, so it's worth a handful of requests for a
 * hand-picked set. Anything that fails to load still exports from the list
 * data already in hand rather than dropping the item.
 */
async function loadDetail(item) {
  try {
    const res = await fetch(`${API_URL}/api/items/${item.id}`)
    return res.ok ? { ...item, ...(await res.json()) } : item
  } catch {
    return item
  }
}

function itemToMarkdown(item) {
  const { title, subtitle } = parseTitle(item.title)
  const lines = [`## ${title || item.summary || 'Untitled'}`]

  if (subtitle) lines.push(`_${subtitle}_`)

  const categories = itemCategories(item)
  if (categories.length) lines.push(`**Categories:** ${categories.join(', ')}`)

  const url = sourceUrl(item)
  if (url) lines.push(`**Source:** ${url}`)
  if (item.author) lines.push(`**Author:** ${item.author}`)
  lines.push(`**Saved:** ${new Date(item.created_at).toLocaleDateString()}`)

  if (item.summary) lines.push('', item.summary)

  if (item.key_points?.length) {
    lines.push('', '**Key points**', ...item.key_points.map((point) => `- ${point}`))
  }

  // The user's own words go last and are labelled as theirs — mixing them into
  // the summary above would blur which half of the file the AI wrote.
  if (item.notes) lines.push('', '**My notes**', item.notes)

  return lines.join('\n')
}

export async function exportFavorites(items) {
  const detailed = await Promise.all(items.map(loadDetail))

  const markdown = [
    '# My favorites',
    `_${detailed.length} starred ${detailed.length === 1 ? 'item' : 'items'} from PM Content Vault · exported ${new Date().toLocaleDateString()}_`,
    '',
    detailed.map(itemToMarkdown).join('\n\n---\n\n'),
    '',
  ].join('\n')

  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `favorites-${new Date().toISOString().slice(0, 10)}.md`
  link.click()
  URL.revokeObjectURL(url)

  return detailed.length
}
