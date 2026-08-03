import * as cheerio from 'cheerio'

const MAX_BODY_LENGTH = 20000
const FETCH_TIMEOUT_MS = 15000
// Below this a fetch returned essentially nothing — a JS-rendered shell.
// Kept low deliberately: some legitimate pages are genuinely short (e.g.
// example.com is ~125 chars), and a false "couldn't read it" is worse than
// occasionally saving a thin page.
const EMPTY_SHELL_LENGTH = 80
// A login wall has some text, but it's all sign-in chrome. Only treat
// login keywords as a wall when the page is also short — real articles
// often include "sign in" in their nav/footer without being gated.
const LOGIN_WALL_MAX_LENGTH = 800
const LOGIN_WALL_PATTERNS = /sign in|log in|login|join now|create account|continue with/i

// A LinkedIn post page also embeds ~10 unrelated "More relevant posts",
// every comment, and sign-up chrome. Grabbing the whole body sweeps all of
// that in, so target the main post's own commentary node instead.
const LINKEDIN_POST_SELECTORS = [
  '[data-test-id="main-feed-activity-card__commentary"]',
  '.attributed-text-segment-list__content',
]

const IMAGE_CHECK_TIMEOUT_MS = 6000
// Below this in either dimension it's a tracking pixel, icon or avatar, not
// artwork worth showing on a card.
const MIN_THUMBNAIL_DIMENSION = 200
const NON_ARTWORK_PATTERN = /sprite|icon|logo|avatar|placeholder|1x1|pixel|spacer|badge|button/i

// Verifies an image URL actually resolves before it gets stored. Publishers
// routinely leave a stale og:image behind (TechCrunch's points at a deleted
// file), and an unchecked URL means a permanently blank card.
async function imageResolves(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PMContentVault/0.1)' },
      signal: AbortSignal.timeout(IMAGE_CHECK_TIMEOUT_MS),
    })
    return res.ok && (res.headers.get('content-type') || '').startsWith('image/')
  } catch {
    return false
  }
}

function absoluteUrl(src, pageUrl) {
  try {
    const resolved = new URL(src, pageUrl)
    return /^https?:$/.test(resolved.protocol) ? resolved.href : null
  } catch {
    return null
  }
}

// Ranked candidates: the publisher's declared social image first, then any
// in-article artwork big enough to be meaningful.
function imageCandidates($, pageUrl) {
  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:url"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('meta[name="twitter:image:src"]').attr('content'),
    $('link[rel="image_src"]').attr('href'),
  ]

  $('article img, main img, figure img, img').each((_, el) => {
    const $img = $(el)
    const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src')
    if (!src || NON_ARTWORK_PATTERN.test(src)) return

    // Only trust declared dimensions when present — many lazy-loaded images
    // omit them entirely, and those are still worth trying.
    const width = Number($img.attr('width')) || 0
    const height = Number($img.attr('height')) || 0
    if ((width && width < MIN_THUMBNAIL_DIMENSION) || (height && height < MIN_THUMBNAIL_DIMENSION)) return

    candidates.push(src)
  })

  const seen = new Set()
  return candidates
    .map((src) => (src ? absoluteUrl(src.trim(), pageUrl) : null))
    .filter((src) => src && !seen.has(src) && seen.add(src))
}

// First candidate that actually loads. Checked in order and capped, so a page
// full of broken images can't stall the save.
const MAX_IMAGE_CHECKS = 6

// Image-only lookup for callers that just want artwork (a note containing a
// link, say) and don't need the page's text extracted.
export async function fetchPageImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PMContentVault/0.1)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!res.ok) return null
    if (!(res.headers.get('content-type') || '').includes('text/html')) return null

    return await pickPageImage(cheerio.load(await res.text()), url)
  } catch {
    return null
  }
}

export async function pickPageImage($, pageUrl) {
  const candidates = imageCandidates($, pageUrl).slice(0, MAX_IMAGE_CHECKS)

  for (const candidate of candidates) {
    if (await imageResolves(candidate)) return candidate
  }

  return null
}

// LinkedIn wraps outbound links in a tracking redirect; unwrap it so the
// saved link points where the author actually intended.
function unwrapRedirect(href) {
  if (!href) return null
  try {
    const parsed = new URL(href, 'https://www.linkedin.com')
    const target = parsed.searchParams.get('url')
    return target ? decodeURIComponent(target) : href
  } catch {
    return href
  }
}

// Converts an element's HTML to text while keeping the line and paragraph
// breaks that make a post readable. `.text()` alone flattens everything
// into one unreadable block. Anchors become markdown-style [label](url) so
// the UI can render them as real links instead of dead text.
function toStructuredText($, $el) {
  $el.find('a').each((_, el) => {
    const $a = $(el)
    const label = $a.text().trim()
    const href = unwrapRedirect($a.attr('href'))
    if (!label) return
    $a.replaceWith(href ? `[${label}](${href})` : label)
  })

  $el.find('br').replaceWith('\n')
  $el.find('p, div, li, h1, h2, h3, h4, h5, h6, blockquote, section, tr').each((_, el) => {
    $(el).append('\n')
  })
  $el.find('li').each((_, el) => $(el).prepend('• '))

  return (
    $el
      .text()
      .replace(/ /g, ' ') // &nbsp; → normal space
      .replace(/[ \t]+/g, ' ') // collapse runs of spaces, but keep newlines
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // at most one blank line between paragraphs
      .trim()
  )
}

function extractLinkedInPost($) {
  for (const selector of LINKEDIN_POST_SELECTORS) {
    const $post = $(selector).first()
    if ($post.length) {
      const text = toStructuredText($, $post)
      if (text.length > EMPTY_SHELL_LENGTH) return text
    }
  }
  return null
}

// Prefer the semantic content container over the whole body so nav,
// sidebars, and comment threads don't end up in the saved text.
function extractArticleBody($) {
  for (const selector of ['article', 'main', '[role="main"]']) {
    const $el = $(selector).first()
    if ($el.length) {
      const text = toStructuredText($, $el)
      if (text.length > EMPTY_SHELL_LENGTH) return text
    }
  }
  return toStructuredText($, $('body'))
}

// Returns { ok, extractedText, title, imageUrl } on success, or
// { ok: false, reason } with a human-readable explanation. Never throws for
// an unfetchable link — the caller offers the user a fallback (save link
// only / paste manually) instead of failing the whole save.
export async function extractFromUrl(url) {
  let res
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PMContentVault/0.1)' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
  } catch (err) {
    const reason =
      err.name === 'TimeoutError'
        ? "the site didn't respond in time"
        : "the site couldn't be reached"
    return { ok: false, reason }
  }

  if (!res.ok) {
    const reason =
      res.status === 401 || res.status === 403
        ? 'the site blocked the request (it likely requires a login)'
        : res.status === 404
          ? 'the page was not found (404)'
          : `the site returned an error (${res.status})`
    return { ok: false, reason }
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  // Read meta tags before stripping anything — the post's own image lets the
  // detail view show it inline instead of making the user open the original
  // link, and gives the Library card real artwork.
  const imageUrl = await pickPageImage($, url)
  const ogTitle = $('meta[property="og:title"]').attr('content') || ''
  const ogDescription = $('meta[property="og:description"]').attr('content') || ''

  $('script, style, noscript, nav, footer, header, aside').remove()

  const isLinkedIn = /(^|\.)linkedin\.com$/i.test(new URL(url).hostname)

  // LinkedIn's og:title is "<post excerpt>… | <Author>" — the trailing
  // segment is the only reliable place the author's name appears.
  const author = isLinkedIn && ogTitle.includes('|') ? ogTitle.split('|').pop().trim() : null

  let bodyText = isLinkedIn ? extractLinkedInPost($) : extractArticleBody($)

  // og:description keeps the post's own line breaks, so it's a better
  // fallback than a flattened body scrape.
  if (!bodyText || bodyText.length < EMPTY_SHELL_LENGTH) {
    bodyText = ogDescription.trim() || bodyText
  }

  if (!bodyText || bodyText.length < EMPTY_SHELL_LENGTH) {
    return {
      ok: false,
      reason: "the page didn't return readable text (it probably loads content with JavaScript)",
    }
  }

  if (bodyText.length < LOGIN_WALL_MAX_LENGTH && LOGIN_WALL_PATTERNS.test(bodyText)) {
    return { ok: false, reason: 'the page is behind a login wall' }
  }

  const pageTitle = $('title').first().text().trim() || ogTitle || url
  const heading = isLinkedIn ? author : pageTitle

  return {
    ok: true,
    title: pageTitle,
    author,
    imageUrl,
    extractedText: [heading, bodyText.slice(0, MAX_BODY_LENGTH)].filter(Boolean).join('\n\n'),
  }
}
