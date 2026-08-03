import { ArrowRight, MessageSquare, Plus, Search, Star, Zap } from 'lucide-react'
import SectionCard from './SectionCard.jsx'

// Hover deepens each tile's own tint rather than jumping to a shared colour.
const HOVER_TONES = {
  primary: 'group-hover:bg-primary/15',
  secondary: 'group-hover:bg-secondary/20',
  warning: 'group-hover:bg-warning/20',
  success: 'group-hover:bg-success/20',
}

const TONES = {
  primary: 'bg-primary-light text-primary',
  secondary: 'bg-secondary/10 text-secondary',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
}

// The "what can I do next" answer. Every action here already exists elsewhere
// in the app — this is a shortcut surface, not new functionality.
function QuickActions({ onSearch, onAdd, onAsk, onFavorites, delay = 0 }) {
  const actions = [
    { key: 'search', icon: Search, title: 'Search Vault', subtitle: 'Find any content', tone: 'primary', onClick: onSearch },
    { key: 'add', icon: Plus, title: 'Add Content', subtitle: 'Save new resource', tone: 'secondary', onClick: onAdd },
    { key: 'ask', icon: MessageSquare, title: 'Ask My Vault', subtitle: 'Chat with your data', tone: 'warning', onClick: onAsk },
    { key: 'favorites', icon: Star, title: 'Favorites', subtitle: 'View starred items', tone: 'success', onClick: onFavorites },
  ]

  return (
    <SectionCard icon={Zap} title="Quick Actions" subtitle="Jump to what you want to do." delay={delay}>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {actions.map(({ key, icon: Icon, title, subtitle, tone, onClick }) => (
          <button
            key={key}
            onClick={onClick}
            className="group flex flex-col items-start gap-2 rounded-xl bg-muted/50 p-3.5 text-left ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface hover:shadow-card-hover hover:ring-border-subtle/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:scale-105 ${TONES[tone]} ${HOVER_TONES[tone]}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>

            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text-primary">{title}</span>
              <span className="mt-0.5 block truncate text-caption text-text-secondary">{subtitle}</span>
            </span>

            <ArrowRight className="h-3.5 w-3.5 text-text-secondary transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </SectionCard>
  )
}

export default QuickActions
