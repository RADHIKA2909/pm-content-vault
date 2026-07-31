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

function Ingest() {
  const [activeTab, setActiveTab] = useState('text')
  const ActiveComponent = TABS.find((t) => t.key === activeTab).Component

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Save something new</h2>
      <p className="text-sm text-slate-500 mb-5">Choose how you want to bring content into your vault.</p>

      <div className="flex flex-wrap gap-1.5 mb-6 rounded-full bg-slate-100 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm font-medium'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <ActiveComponent />
      </div>
    </div>
  )
}

export default Ingest
