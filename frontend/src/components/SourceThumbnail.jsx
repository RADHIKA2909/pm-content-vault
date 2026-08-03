import { useState } from 'react'
import {
  Briefcase,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Linkedin,
  MessageCircle,
  NotebookPen,
  Type,
} from 'lucide-react'

const TILE_CONFIG = {
  text: { Icon: Type, bg: 'bg-muted', fg: 'text-text-secondary' },
  question: { Icon: HelpCircle, bg: 'bg-primary-light', fg: 'text-primary' },
  job: { Icon: Briefcase, bg: 'bg-secondary/10', fg: 'text-secondary' },
  linkedin_paste: { Icon: Linkedin, bg: 'bg-primary-light', fg: 'text-primary' },
  whatsapp_export: { Icon: MessageCircle, bg: 'bg-success/10', fg: 'text-success' },
  pdf: { Icon: FileText, bg: 'bg-warning/10', fg: 'text-warning' },
  image: { Icon: ImageIcon, bg: 'bg-secondary/10', fg: 'text-secondary' },
  link: { Icon: LinkIcon, bg: 'bg-muted', fg: 'text-text-secondary' },
  note: { Icon: NotebookPen, bg: 'bg-accent-light', fg: 'text-accent' },
}

// thumbnail_url is a purpose-made card image (a PDF's rendered first page).
// file_url is the stored original, which only doubles as artwork when it
// happens to be an image — for a PDF it points at the document itself and
// can't be rendered.
function previewImage(item) {
  if (item.thumbnail_url) return item.thumbnail_url
  if (item.file_url && ['image', 'link', 'note'].includes(item.source_type)) return item.file_url
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
