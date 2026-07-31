import { Linkedin, MessageCircle, FileText, Image as ImageIcon, Link as LinkIcon } from 'lucide-react'

const SOURCE_CONFIG = {
  linkedin_paste: { label: 'LinkedIn', Icon: Linkedin },
  whatsapp_export: { label: 'WhatsApp', Icon: MessageCircle },
  pdf: { label: 'PDF', Icon: FileText },
  image: { label: 'Image', Icon: ImageIcon },
  link: { label: 'Web', Icon: LinkIcon },
}

function SourceBadge({ sourceType, showLabel = true }) {
  const config = SOURCE_CONFIG[sourceType] || { label: sourceType, Icon: LinkIcon }
  const { label, Icon } = config

  return (
    <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
      {showLabel && label}
    </span>
  )
}

export default SourceBadge
