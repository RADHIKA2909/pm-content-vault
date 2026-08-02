import { useState } from 'react'
import { Linkedin, MessageCircle, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'

const TILE_CONFIG = {
  linkedin_paste: { Icon: Linkedin, bg: 'bg-primary-light', fg: 'text-primary' },
  whatsapp_export: { Icon: MessageCircle, bg: 'bg-success/10', fg: 'text-success' },
  pdf: { Icon: FileText, bg: 'bg-warning/10', fg: 'text-warning' },
  image: { Icon: ImageIcon, bg: 'bg-secondary/10', fg: 'text-secondary' },
  link: { Icon: LinkIcon, bg: 'bg-muted', fg: 'text-text-secondary' },
}

// PDFs also carry a file_url, but it points at the PDF itself and can't be
// rendered as an image — only uploads and link previews have real artwork.
function previewImage(item) {
  if (!item.file_url) return null
  if (item.source_type === 'image' || item.source_type === 'link') return item.file_url
  return null
}

// Shows the item's real artwork when there is one (uploaded image, or a
// link's preview image) so the card is recognisable at a glance; otherwise
// falls back to a colored icon tile.
function SourceThumbnail({ item }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = previewImage(item)

  if (image && !imageFailed) {
    return (
      <img
        src={image}
        alt=""
        loading="lazy"
        onError={() => setImageFailed(true)}
        // Anchor to the top: posts and infographics put their title there,
        // so a centre crop hides the most recognisable part.
        className="h-full w-full object-cover object-top"
      />
    )
  }

  // A LinkedIn-typed link should look like other LinkedIn items, not like a
  // generic web link.
  const config =
    item.source_type === 'link' && item.link_type === 'linkedin'
      ? TILE_CONFIG.linkedin_paste
      : TILE_CONFIG[item.source_type] || TILE_CONFIG.link

  const { Icon, bg, fg } = config

  return (
    <div className={`flex h-full w-full items-center justify-center ${bg}`}>
      <Icon className={`h-8 w-8 ${fg}`} strokeWidth={1.5} />
    </div>
  )
}

export default SourceThumbnail
