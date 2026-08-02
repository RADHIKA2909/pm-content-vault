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

  // Read meta tags before stripping anything — og:image is the post's own
  // image, so the detail view can show it inline instead of making the
  // user open the original link.
  const imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    null
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
    imageUrl,
    extractedText: [heading, bodyText.slice(0, MAX_BODY_LENGTH)].filter(Boolean).join('\n\n'),
  }
}
