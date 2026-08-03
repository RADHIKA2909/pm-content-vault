import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, FolderTree, Layers, Lightbulb, Plus, Search, Star } from 'lucide-react'
import { API_URL } from '../lib/api.js'
import { FAVORITE_TAG, itemCategories } from '../lib/categories.js'
import Button from '../components/Button.jsx'
import Modal from '../components/Modal.jsx'
import { SkeletonCard } from '../components/Skeleton.jsx'
import AddContentFlow from '../components/ingest/AddContentFlow.jsx'
import HeaderFlourish from '../components/decorations/HeaderFlourish.jsx'
import MetricCard from '../components/dashboard/MetricCard.jsx'
import ContinueLearning from '../components/dashboard/ContinueLearning.jsx'
import QuickActions from '../components/dashboard/QuickActions.jsx'
import RecentSaves from '../components/dashboard/RecentSaves.jsx'
import CategoryBrowser from '../components/dashboard/CategoryBrowser.jsx'

// Personalization touch for this single-user v0 tool — swap for a real
// profile name once Supabase Auth login exists.
const USER_FIRST_NAME = 'Radhika'

const WEEK_MS = 7 * 86400000

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const withinWeek = (iso) => Boolean(iso) && Date.now() - new Date(iso) < WEEK_MS

function Dashboard() {
  const [items, setItems] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [search, setSearch] = useState('')
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

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const item of items) {
      for (const c of itemCategories(item)) counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [items])

  const topCategories = useMemo(
    () => Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]),
    [categoryCounts],
  )

  const stats = useMemo(() => {
    const favorites = items.filter((i) => i.tags?.some((t) => t.tag === FAVORITE_TAG))

    // Trends come from the created_at on each related row. Duplicates get no
    // trend on purpose: their rows are deleted and re-inserted every time an
    // item is re-enriched, so created_at means "last re-checked", not "first
    // detected" — and a decrease can't be known without a stored snapshot.
    const newCategories = new Set()
    for (const item of items) {
      for (const c of item.item_categories || []) {
        if (withinWeek(c.created_at)) newCategories.add(c.category)
      }
    }

    return {
      total: items.length,
      totalTrend: items.filter((i) => withinWeek(i.created_at)).length,
      categories: Object.keys(categoryCounts).length,
      categoriesTrend: newCategories.size,
      favorites: favorites.length,
      favoritesTrend: favorites.filter((i) =>
        i.tags?.some((t) => t.tag === FAVORITE_TAG && withinWeek(t.created_at)),
      ).length,
      duplicates: items.filter((i) => i.duplicateOf).length,
    }
  }, [items, categoryCounts])

  const openLibrary = (state) => navigate('/library', state ? { state } : undefined)

  const submitSearch = (e) => {
    e.preventDefault()
    openLibrary(search.trim() ? { search: search.trim() } : undefined)
  }

  return (
    <div className="relative flex flex-col gap-3.5">
      {/* `isolate` is scoped to the flourish, not the page. The flourish sits
          at -z-10 and needs a local stacking context or it disappears behind
          the app background — but putting that context on the page root also
          traps the Add Content modal inside it, letting the mobile nav's z-40
          paint over the modal's z-50. */}
      <div className="absolute inset-x-0 top-0 isolate">
        <HeaderFlourish />
      </div>

      <header className="relative">
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[30px]">
              {greeting()}, {USER_FIRST_NAME} <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-body text-text-secondary">
              Your personal PM knowledge hub.
              {!loading && (
                <>
                  {' '}
                  <span className="text-border-subtle" aria-hidden="true">·</span>{' '}
                  <span className="font-semibold text-primary">{stats.total}</span> saved{' '}
                  {stats.total === 1 ? 'resource' : 'resources'} across{' '}
                  <span className="font-semibold text-primary">{stats.categories}</span>{' '}
                  {stats.categories === 1 ? 'category' : 'categories'}.
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <form onSubmit={submitSearch} className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your vault..."
                aria-label="Search your vault"
                className="w-56 rounded-xl bg-surface py-2.5 pl-9 pr-3 text-sm shadow-card ring-1 ring-border-subtle transition-all duration-200 placeholder:text-text-secondary focus:shadow-[0_0_0_4px_rgba(99,102,241,0.12)] focus:outline-none focus:ring-2 focus:ring-primary lg:w-72"
              />
            </form>

            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Content
            </Button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-[15px] font-semibold tracking-tight text-text-primary">Knowledge Snapshot</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={Layers}
                label="Saved Resources"
                value={stats.total}
                description="Everything in your vault"
                trend={stats.totalTrend}
                tone="primary"
                onClick={() => openLibrary()}
                delay={0}
              />
              <MetricCard
                icon={FolderTree}
                label="Categories"
                value={stats.categories}
                description="Topics you've filed under"
                trend={stats.categoriesTrend}
                tone="secondary"
                onClick={() => openLibrary()}
                delay={60}
              />
              <MetricCard
                icon={Star}
                label="Favorites"
                value={stats.favorites}
                description="Starred for quick access"
                trend={stats.favoritesTrend}
                tone="warning"
                onClick={() => navigate('/favorites')}
                delay={120}
              />
              {/* No trend chip here — see the comment in `stats`. */}
              <MetricCard
                icon={Copy}
                label="Duplicates"
                value={stats.duplicates}
                description="Possible repeats to review"
                tone="success"
                onClick={() => openLibrary()}
                delay={180}
              />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ContinueLearning
              history={chatHistory}
              onOpenSession={(sessionId) => navigate('/chat', { state: { sessionId } })}
              onViewAll={() => navigate('/chat')}
              delay={220}
            />
            <QuickActions
              onSearch={() => openLibrary()}
              onAdd={() => setAddOpen(true)}
              onAsk={() => navigate('/chat')}
              onFavorites={() => navigate('/favorites')}
              delay={260}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RecentSaves
              items={items.slice(0, 3)}
              onOpen={(id) => navigate(`/library/${id}`)}
              onViewAll={() => openLibrary()}
              delay={300}
            />
            <CategoryBrowser
              categories={topCategories}
              onOpen={(category) => openLibrary({ category })}
              delay={340}
            />
          </div>

          <div
            style={{ animationDelay: '380ms' }}
            className="flex animate-fadeUp flex-wrap items-center gap-x-3 gap-y-2 self-start rounded-2xl bg-surface px-4 py-2 shadow-card ring-1 ring-border-subtle/70"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-primary">Did you know?</span>
              <span className="block text-caption text-text-secondary">
                You can ask questions across all your saved PDFs, notes and links.
              </span>
            </span>
            <button
              onClick={() => navigate('/chat')}
              className="ml-auto shrink-0 rounded-lg bg-primary-light px-3 py-1.5 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Ask My Vault
            </button>
          </div>
        </>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Content" size="xl">
        <AddContentFlow
          onSaved={fetchAll}
          onNavigate={(to) => {
            setAddOpen(false)
            // Same rule as the sidebar: finishing here lands in Library,
            // showing the item that was just added.
            navigate(to, to === '/library' ? { state: { savedAt: Date.now() } } : undefined)
          }}
        />
      </Modal>
    </div>
  )
}

export default Dashboard
