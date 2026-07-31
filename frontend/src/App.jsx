import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Ingest from './pages/Ingest.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Chat from './pages/Chat.jsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Ingest />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="chat" element={<Chat />} />
      </Route>
    </Routes>
  )
}

export default App
