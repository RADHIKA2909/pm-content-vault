import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import MobileBottomNav from './MobileBottomNav.jsx'

function Layout() {
  return (
    <div className="flex min-h-screen bg-bg-app text-text-primary">
      <Sidebar />

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="animate-pageIn px-4 py-5 md:px-8 md:py-5 lg:px-10">
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default Layout
