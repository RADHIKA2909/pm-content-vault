import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/auth/RequireAuth.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Library from './pages/Library.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import Chat from './pages/Chat.jsx'
import Favorites from './pages/Favorites.jsx'
import Settings from './pages/Settings.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* The guard wraps the shared Layout rather than each page, so a route
          added later is protected by default — the failure mode of per-route
          guards is the one page someone forgets to wrap. */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="library" element={<Library />} />
        <Route path="library/:id" element={<ItemDetail />} />
        <Route path="chat" element={<Chat />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
