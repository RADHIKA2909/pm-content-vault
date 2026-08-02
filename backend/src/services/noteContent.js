import * as cheerio from 'cheerio'

// Note bodies are HTML written in a contenteditable field, which means they can
// carry whatever the user pasted in from another site — including scripts and
// event handlers. Everything is filtered against an allowlist before it is
// stored, so nothing executable can ever reach the detail view.

// Dropped along with their contents — the text inside them isn't content.
const STRIP_ENTIRELY = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'form', 'input', 'button', 'svg']

// Kept as-is. Anything not listed is unwrapped: the tag goes, its text stays.
const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span',
  'b', 'strong', 'i', 'em', 'u', 's',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3',
  'blockquote', 'code', 'pre',
  'a', 'img',
])

const ALLOWED_ATTRS = {
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
}

const SAFE_URL = /^https?:\/\//i

// Tags that should read as their own line when flattened to plain text.
const BLOCK_TAGS = new Set(['p', 'div', 'li', 'h1', 'h2', 'h3', 'blockquote', 'pre', 'br'])

export function sanitizeNoteHtml(html) {
  if (!html?.trim()) return ''

  const $ = cheerio.load(html, null, false)

  $(STRIP_ENTIRELY.join(',')).remove()

  $('*').each((_, el) => {
    const $el = $(el)
    const tag = el.tagName?.toLowerCase()

    if (!ALLOWED_TAGS.has(tag)) {
      $el.replaceWith($el.contents())
      return
    }

    const allowed = ALLOWED_ATTRS[tag] || []
    for (const attr of Object.keys(el.attribs || {})) {
      if (!allowed.includes(attr)) $el.removeAttr(attr)
    }

    // A link or image whose URL isn't plainly http(s) is dropped rather than
    // trusted — this is what blocks javascript: and data: payloads.
    if (tag === 'a' && !SAFE_URL.test($el.attr('href') || '')) {
      $el.replaceWith($el.contents())
    } else if (tag === 'a') {
      $el.attr('target', '_blank')
      $el.attr('rel', 'noopener noreferrer')
    } else if (tag === 'img' && !SAFE_URL.test($el.attr('src') || '')) {
      $el.remove()
    }
  })

  return $.html().trim()
}

// Plain-text version for embedding, categorisation and search. Images become
// their alt text (or nothing), links keep their label, and block elements
// become line breaks so the structure survives.
export function noteHtmlToText(html) {
  if (!html?.trim()) return ''

  const $ = cheerio.load(html, null, false)

  $('img').each((_, el) => {
    const alt = $(el).attr('alt')
    $(el).replaceWith(alt ? `${alt}\n` : '\n')
  })

  $('*').each((_, el) => {
    if (BLOCK_TAGS.has(el.tagName?.toLowerCase())) $(el).append('\n')
  })

  return $.text()
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// The first pasted image doubles as the item's thumbnail, so a note shows up
// on the Library card the same way an uploaded image does.
export function firstImageUrl(html) {
  if (!html?.trim()) return null
  const $ = cheerio.load(html, null, false)
  const src = $('img').first().attr('src')
  return src && SAFE_URL.test(src) ? src : null
}

// Fallback when a note has no pasted image: the first link in it may have
// artwork worth borrowing for the card.
export function firstLinkUrl(html) {
  if (!html?.trim()) return null
  const $ = cheerio.load(html, null, false)
  const href = $('a[href]').first().attr('href')
  return href && SAFE_URL.test(href) ? href : null
}
