import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { IngestIcon, DashboardIcon, ChatIcon, SparkleIcon } from './icons.jsx'
import ResurfaceWidget from './ResurfaceWidget.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Ingest', Icon: IngestIcon, end: true },
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/chat', label: 'Ask your vault', Icon: ChatIcon },
]

function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white">
            <SparkleIcon className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">PM Content Vault</span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-5 py-4 text-xs text-slate-400">v0 · single user</div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {location.pathname === '/dashboard' && <ResurfaceWidget />}
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
