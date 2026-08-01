import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Library from './pages/Library.jsx'
import ItemDetail from './pages/ItemDetail.jsx'
import Chat from './pages/Chat.jsx'
import Favorites from './pages/Favorites.jsx'
import Settings from './pages/Settings.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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
