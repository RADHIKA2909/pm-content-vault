import { useState } from 'react'
import {
  Briefcase,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Linkedin,
  NotebookPen,
} from 'lucide-react'
import WhatsappMark from './WhatsappMark.jsx'

// The small-tile counterpart to the Library card heroes. It stays icon-led —
// at 56–86px a generated cover or a page render is an unreadable smudge — but
// it has to agree with the big cards about *what an item is*.
const TILE_CONFIG = {
  // Same tile as `note`: the two input types merged, so a pasted item and a
  // written one are one thing everywhere else and must not split here.
  text: { Icon: NotebookPen, bg: 'bg-accent-light', fg: 'text-accent' },
  question: { Icon: HelpCircle, bg: 'bg-primary-light', fg: 'text-primary' },
  job: { Icon: Briefcase, bg: 'bg-secondary/10', fg: 'text-secondary' },
  linkedin_paste: { Icon: Linkedin, bg: 'bg-primary-light', fg: 'text-primary' },
  // The real mark, not lucide's generic bubble — the point of this tile is
  // knowing the item came out of a chat export without reading a word.
  whatsapp_export: { Mark: WhatsappMark, bg: 'bg-[#25D366]/10', fg: 'fill-[#25D366]' },
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

  const { Icon, Mark, bg, fg } = config

  return (
    <div className={`flex h-full w-full items-center justify-center ${bg}`}>
      {Mark ? <Mark className={`h-7 w-7 ${fg}`} /> : <Icon className={`h-8 w-8 ${fg}`} strokeWidth={1.5} />}
    </div>
  )
}

export default SourceThumbnail
