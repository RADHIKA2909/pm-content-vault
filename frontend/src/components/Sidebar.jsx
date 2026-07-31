import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Library, MessageSquare, RotateCw, Settings, ChevronLeft, ChevronRight, Sparkles, User } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/chat', label: 'Ask My Vault', Icon: MessageSquare },
  { to: '/review', label: 'Review Queue', Icon: RotateCw },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function Sidebar({ collapsed, onToggleCollapse }) {
  // collapsed=false still auto-collapses to icon-only between md/lg (tablet)
  // via the `lg:` breakpoint below — manual toggle forces it at every size.
  const labelClass = collapsed ? 'hidden' : 'hidden lg:inline'
  const widthClass = collapsed ? 'md:w-16' : 'md:w-16 lg:w-60'

  return (
    <aside
      className={`hidden md:flex ${widthClass} shrink-0 flex-col border-r border-border-subtle bg-surface transition-[width] duration-200`}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className={`truncate font-semibold tracking-tight text-text-primary ${labelClass}`}>
          PM Content Vault
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-2.5">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-primary-light font-medium text-primary' : 'text-text-secondary hover:bg-muted'
              }`
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
            <span className={labelClass}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 border-t border-border-subtle px-2.5 py-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-text-secondary">
            <User className="h-3.5 w-3.5" strokeWidth={1.75} />
          </div>
          <span className={`truncate text-caption text-text-secondary ${labelClass}`}>v0 · single user</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-caption text-text-secondary transition-colors hover:bg-muted lg:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
