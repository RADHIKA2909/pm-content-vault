// Seeds the rich-text editor from an item's stored plain text.
//
// Mirrors structuredTextToHtml in backend/src/services/noteContent.js, which
// handles the reverse trip on save. Both must keep [label](url) anchors intact
// — that's how extracted_text stores links (see linkExtractor.js), and losing
// them would strip every URL out of a saved post the first time it was edited.

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
const BARE_URL = /(https?:\/\/[^\s<]+)/g
const SAFE_URL = /^https?:\/\//i

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function structuredTextToHtml(text) {
  if (!text?.trim()) return ''

  return text
    .split(/\n{2,}/)
    .map((block) => {
      const withLinks = escapeHtml(block)
        .replace(MARKDOWN_LINK, (_, label, url) =>
          SAFE_URL.test(url) ? `<a href="${url}">${label}</a>` : label,
        )
        // Skips URLs the step above already wrapped in an href.
        .replace(BARE_URL, (url, _m, offset, whole) =>
          whole.slice(0, offset).endsWith('href="') ? url : `<a href="${url}">${url}</a>`,
        )
        .replace(/\n/g, '<br />')
      return `<p>${withLinks}</p>`
    })
    .join('')
}
