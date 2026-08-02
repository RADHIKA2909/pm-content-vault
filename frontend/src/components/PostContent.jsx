// Matches [label](url) links produced by the extractor, plus bare URLs
// typed directly in the text. Split keeps the captured groups so the parts
// can be rebuilt as real anchors.
const TOKEN_SPLIT = /(\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s]+)/g
const MARKDOWN_LINK = /^\[([^\]]+)\]\(([^)]+)\)$/
const BARE_URL = /^https?:\/\//

function LinkPart({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-primary hover:underline"
    >
      {children}
    </a>
  )
}

// Renders saved post text the way it was written: line breaks preserved and
// links clickable, rather than as one flat block of grey text.
function PostContent({ text }) {
  if (!text) return null

  return (
    <p className="whitespace-pre-wrap break-words text-body leading-relaxed text-text-primary">
      {text.split(TOKEN_SPLIT).map((part, i) => {
        const markdown = part.match(MARKDOWN_LINK)
        if (markdown) {
          return (
            <LinkPart key={i} href={markdown[2]}>
              {markdown[1]}
            </LinkPart>
          )
        }

        if (BARE_URL.test(part)) {
          return (
            <LinkPart key={i} href={part}>
              {part}
            </LinkPart>
          )
        }

        return part
      })}
    </p>
  )
}

export default PostContent
