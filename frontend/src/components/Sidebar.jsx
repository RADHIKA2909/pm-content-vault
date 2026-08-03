import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Library, MessageSquare, Star, Settings, Sparkles, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import { useToast } from './ToastContext.jsx'
import AddContentFlow from './ingest/AddContentFlow.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/chat', label: 'Ask Vault', Icon: MessageSquare },
  { to: '/favorites', label: 'Favorites', Icon: Star },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function Sidebar() {
  const [addOpen, setAddOpen] = useState(false)
  const { showToast } = useToast()
  const navigate = useNavigate()

  return (
    <aside className="hidden w-24 shrink-0 flex-col items-center border-r border-border-subtle bg-surface py-5 md:flex">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-white">
        <Sparkles className="h-4 w-4" />
      </div>

      <button
        onClick={() => setAddOpen(true)}
        title="Add Content"
        className="mb-5 flex flex-col items-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-white transition-colors hover:bg-primary-hover"
      >
        <Plus className="h-4 w-4" />
        <span className="text-[10px] font-medium leading-none">Add</span>
      </button>

      <nav className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex w-20 flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-colors ${
                isActive ? 'bg-accent-light text-accent' : 'text-text-secondary hover:bg-muted'
              }`
            }
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={1.75} />
            <span className="text-center text-[10px] font-medium leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Content" size="xl">
        <AddContentFlow
          onSaved={() => showToast('Saved to your vault')}
          onNavigate={(to) => {
            setAddOpen(false)
            // Land on Library so the new card is visible straight away. The
            // state carries no meaning — it's the fresh history entry that
            // makes Library refetch even when we're already on it.
            navigate(to, to === '/library' ? { state: { savedAt: Date.now() } } : undefined)
          }}
        />
      </Modal>
    </aside>
  )
}

export default Sidebar
