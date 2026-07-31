import { useState } from 'react'
import IngestText from '../components/IngestText.jsx'
import IngestLink from '../components/IngestLink.jsx'
import IngestImage from '../components/IngestImage.jsx'
import IngestPdf from '../components/IngestPdf.jsx'
import IngestWhatsapp from '../components/IngestWhatsapp.jsx'

const TABS = [
  { key: 'text', label: 'Paste text', Component: IngestText },
  { key: 'link', label: 'Paste link', Component: IngestLink },
  { key: 'image', label: 'Image', Component: IngestImage },
  { key: 'pdf', label: 'PDF', Component: IngestPdf },
  { key: 'whatsapp', label: 'WhatsApp', Component: IngestWhatsapp },
]

function Ingest({ onSaved }) {
  const [activeTab, setActiveTab] = useState('text')
  const ActiveComponent = TABS.find((t) => t.key === activeTab).Component

  return (
    <div>
      <div className="mb-4 flex w-fit flex-wrap gap-1 rounded-full bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-caption transition-colors ${
              activeTab === tab.key
                ? 'bg-surface font-medium text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ActiveComponent onSaved={onSaved} />
    </div>
  )
}

export default Ingest
