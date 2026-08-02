import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, MessageSquare, Star } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { parseTitle } from '../lib/parseTitle.js'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { CategoryChip } from '../components/Chip.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import Ingest from './Ingest.jsx'
import { FAVORITE_TAG } from './Library.jsx'
import FavoritesDecoration from '../components/decorations/FavoritesDecoration.jsx'
import KnowledgeHealthDecoration from '../components/decorations/KnowledgeHealthDecoration.jsx'

// Personalization touch for this single-user v0 tool — swap for a real
// profile name once Supabase Auth login exists.
const USER_FIRST_NAME = 'Radhika'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function Dashboard() {
  const [items, setItems] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const navigate = useNavigate()

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [itemsRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/items`),
        fetch(`${API_URL}/api/chat/history`),
      ])
      setItems(await itemsRes.json())
      setChatHistory(await historyRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const favoriteCount = useMemo(
    () => items.filter((i) => i.tags?.some((t) => t.tag === FAVORITE_TAG)).length,
    [items],
  )

  const stats = useMemo(() => {
    const total = items.length
    const engaged = items.filter((i) => i.last_engaged_at).length
    const duplicates = items.filter((i) => i.duplicateOf).length
    return {
      total,
      openedPct: total ? Math.round((engaged / total) * 100) : 0,
      unopened: total - engaged,
      duplicates,
    }
  }, [items])

  const topCategories = useMemo(() => {
    const counts = {}
    for (const item of items) {
      if (item.category) counts[item.category] = (counts[item.category] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  }, [items])

  const recentSaves = items.slice(0, 3)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-text-primary sm:text-[30px]">
            {greeting()}, {USER_FIRST_NAME} 👋
          </h1>
          <p className="text-body text-text-secondary">Let's make today productive.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/library')}
            className="rounded-xl border border-border-subtle bg-surface p-2.5 text-text-secondary hover:bg-muted"
            title="Search your library"
          >
            <Search className="h-4 w-4" />
          </button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Content
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card hover onClick={() => navigate('/favorites')} className="relative overflow-hidden">
              <FavoritesDecoration />
              <p className="mb-3 text-caption font-medium text-text-secondary">Favorites</p>
              <div className="mb-3 flex items-baseline gap-2">
                <span className="text-[30px] font-semibold text-text-primary">{favoriteCount}</span>
                <span className="text-body text-text-secondary">starred items</span>
              </div>
              <p className="mb-4 text-caption text-text-secondary">Quick access to what matters most</p>
              <Button className="w-full justify-center">
                <Star className="h-4 w-4" /> View Favorites
              </Button>
            </Card>

            <Card className="relative overflow-hidden">
              <KnowledgeHealthDecoration />
              <p className="mb-3 text-caption font-medium text-text-secondary">Knowledge Health</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[24px] font-semibold text-text-primary">{stats.total}</p>
                  <p className="text-caption text-text-secondary">Saved</p>
                </div>
                <div>
                  <p className="text-[24px] font-semibold text-text-primary">{stats.openedPct}%</p>
                  <p className="text-caption text-text-secondary">Opened</p>
                </div>
                <div>
                  <p className="text-[24px] font-semibold text-text-primary">{stats.unopened}</p>
                  <p className="text-caption text-text-secondary">Unopened</p>
                </div>
                <div>
                  <p className="text-[24px] font-semibold text-warning">{stats.duplicates}</p>
                  <p className="text-caption text-text-secondary">Duplicates</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-caption font-medium text-text-secondary">Continue your last chat</p>
                <button onClick={() => navigate('/chat')} className="text-caption text-primary hover:underline">
                  View Chat
                </button>
              </div>
              {chatHistory.length === 0 && (
                <p className="text-sm text-text-secondary">Ask your vault something to get started.</p>
              )}
              <ul className="flex flex-col gap-3">
                {chatHistory.slice(0, 3).map((q) => (
                  <li
                    key={q.id}
                    onClick={() => navigate('/chat', { state: { sessionId: q.session_id } })}
                    className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-muted"
                  >
                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-secondary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{q.query_text}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-caption font-medium text-text-secondary">Recent Saves</p>
              <button onClick={() => navigate('/library')} className="text-caption text-primary hover:underline">
                View all
              </button>
            </div>
            {recentSaves.length === 0 && <p className="text-sm text-text-secondary">Nothing saved yet.</p>}
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {recentSaves.map((item) => (
                <li
                  key={item.id}
                  onClick={() => navigate(`/library/${item.id}`)}
                  className="cursor-pointer rounded-xl px-2 py-1.5 hover:bg-muted"
                >
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {parseTitle(item.title).title || item.summary || item.source_type}
                  </p>
                  <CategoryChip category={item.category} />
                </li>
              ))}
            </ul>
          </Card>

          {topCategories.length > 0 && (
            <Card>
              <p className="mb-3 text-caption font-medium text-text-secondary">Top Categories</p>
              <div className="flex flex-wrap gap-2">
                {topCategories.map(([cat, count]) => (
                  <button
                    key={cat}
                    onClick={() => navigate('/library')}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-caption text-text-secondary hover:bg-primary-light hover:text-primary"
                  >
                    {cat} <span className="font-medium">{count}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Content" size="lg">
        <Ingest
          onSaved={() => {
            setAddOpen(false)
            // Same rule as the sidebar: every save ends up in Library, showing
            // the item that was just added.
            navigate('/library', { state: { savedAt: Date.now() } })
          }}
        />
      </Modal>
    </div>
  )
}

export default Dashboard
