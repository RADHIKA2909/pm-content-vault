import { Linkedin, MessageCircle, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'

const TILE_CONFIG = {
  linkedin_paste: { Icon: Linkedin, bg: 'bg-primary-light', fg: 'text-primary' },
  whatsapp_export: { Icon: MessageCircle, bg: 'bg-success/10', fg: 'text-success' },
  pdf: { Icon: FileText, bg: 'bg-warning/10', fg: 'text-warning' },
  image: { Icon: ImageIcon, bg: 'bg-secondary/10', fg: 'text-secondary' },
  link: { Icon: LinkIcon, bg: 'bg-muted', fg: 'text-text-secondary' },
}

// Real thumbnail for images (once file storage is set up); a colored
// icon tile placeholder for everything else, so Library reads as a visual
// grid instead of a wall of text.
function SourceThumbnail({ item }) {
  if (item.source_type === 'image' && item.file_url) {
    return <img src={item.file_url} alt="" className="h-full w-full object-cover" />
  }

  const { Icon, bg, fg } = TILE_CONFIG[item.source_type] || TILE_CONFIG.link

  return (
    <div className={`flex h-full w-full items-center justify-center ${bg}`}>
      <Icon className={`h-8 w-8 ${fg}`} strokeWidth={1.5} />
    </div>
  )
}

export default SourceThumbnail
