import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Library, MessageSquare, RotateCw, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/library', label: 'Library', Icon: Library },
  { to: '/chat', label: 'Ask', Icon: MessageSquare },
  { to: '/review', label: 'Review', Icon: RotateCw },
  { to: '/settings', label: 'Settings', Icon: Settings },
]

function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border-subtle bg-surface py-2 md:hidden">
      {NAV_ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] ${
              isActive ? 'text-primary' : 'text-text-secondary'
            }`
          }
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export default MobileBottomNav
