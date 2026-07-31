import * as cheerio from 'cheerio'

const MAX_BODY_LENGTH = 5000

// Naive extraction for v0: strip non-content tags and grab visible text.
// Not Readability-quality, but good enough to make a pasted link searchable.
export async function extractFromUrl(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PMContentVault/0.1)' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  $('script, style, nav, footer, header, noscript').remove()

  const title =
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content') ||
    url

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_BODY_LENGTH)

  return {
    title,
    extractedText: `${title}\n\n${bodyText}`,
  }
}
