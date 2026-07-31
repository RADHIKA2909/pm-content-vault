import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import MobileBottomNav from './MobileBottomNav.jsx'

function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true')

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebarCollapsed', String(!prev))
      return !prev
    })
  }

  return (
    <div className="flex min-h-screen bg-bg-app text-text-primary">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <main className="min-w-0 flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-4xl animate-pageIn px-4 py-6 md:px-6 md:py-8 lg:px-8">
          <Outlet />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default Layout
