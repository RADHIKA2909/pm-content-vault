import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronDown, Plus, SlidersHorizontal, X } from 'lucide-react'
import { apiFetch } from '../lib/apiFetch.js'
import { useToast } from '../components/ToastContext.jsx'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { FAVORITE_TAG, itemCategories } from '../lib/categories.js'
import {
  DEFAULT_FILTERS,
  SORTS,
  activeFilterCount,
  filterItems,
  scopeByArchived,
  sortItems,
  sourceUrl,
} from '../lib/itemFilters.js'
import LibraryCard from '../components/LibraryCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Modal from '../components/Modal.jsx'
import AddContentFlow from '../components/ingest/AddContentFlow.jsx'
import LibraryFlourish from '../components/library/LibraryFlourish.jsx'
import SearchBar from '../components/library/SearchBar.jsx'
import CategoryPills from '../components/library/CategoryPills.jsx'
import FilterPanel from '../components/library/FilterPanel.jsx'
import ViewToggle from '../components/library/ViewToggle.jsx'
import EmptyState from '../components/library/EmptyState.jsx'
import LibrarySkeleton, { FilterSkeleton } from '../components/library/LibrarySkeleton.jsx'

// Column counts are written out in full rather than assembled from `railOpen`.
// Tailwind scans source text, so a runtime-built class name never reaches the
// compiled CSS and silently renders as nothing.
const GRID_CLASSES = {
  open: 'grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 min-[1440px]:grid-cols-4 min-[1800px]:grid-cols-5',
  closed:
    'grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1500px]:grid-cols-5',
}
const LIST_CLASSES = 'flex flex-col gap-2'

// Long enough to notice on arrival, short enough not to linger as decoration.
const NEW_ITEM_MS = 4000

function Library() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Archived rows are fetched too, so the Archived filter switches instantly
  // instead of round-tripping. `items` below is the scoped view of them.
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Seeded from navigation state so the Dashboard's search box and category
  // tiles can land here with a filter already applied.
  const [search, setSearch] = useState(location.state?.search || '')
  const [category, setCategory] = useState(location.state?.category || '')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState('newest')

  const [view, setView] = useLocalStorage('pmv.library.view', 'grid')
  const [railOpen, setRailOpen] = useLocalStorage('pmv.library.rail', true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [newItemId, setNewItemId] = useState(null)
  const newItemTimer = useRef(null)

  const fetchItems = useCallback(async ({ markNewest = false, silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)

    try {
      const res = await apiFetch(`/api/items?archived=include`)
      if (!res.ok) throw new Error('Failed to load items')
      const data = await res.json()
      setAllItems(data)

      // The API returns newest-first, so the just-saved row is data[0].
      if (markNewest && data.length) {
        setNewItemId(data[0].id)
        clearTimeout(newItemTimer.current)
        newItemTimer.current = setTimeout(() => setNewItemId(null), NEW_ITEM_MS)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Keyed on location.key so arriving here refetches every time — including
  // when a save navigates to Library from Library, which doesn't remount the
  // page and so would otherwise show a stale list.
  useEffect(() => {
    fetchItems({ markNewest: Boolean(location.state?.savedAt) })
    setSearch(location.state?.search || '')
    setCategory(location.state?.category || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => () => clearTimeout(newItemTimer.current), [])

  // Escape closes the mobile filter drawer.
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e) => e.key === 'Escape' && setDrawerOpen(false)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  // What's in the Library at all, before search and the narrowing filters.
  // Everything downstream — the counts, the pills, the "N items" total — reads
  // from here, so archiving an item removes it from all of them at once.
  const items = useMemo(() => scopeByArchived(allItems, filters.archived), [allItems, filters.archived])

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const item of items) {
      for (const c of itemCategories(item)) counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [items])

  const visibleItems = useMemo(
    () => sortItems(filterItems(items, { search, category, filters }), sort),
    [items, search, category, filters, sort],
  )

  const activeCount = activeFilterCount(filters)
  const isNarrowed = Boolean(search.trim() || category || activeCount)

  const resetAll = () => {
    setSearch('')
    setCategory('')
    setFilters(DEFAULT_FILTERS)
  }

  const handleToggleFavorite = async (id, isFavorite) => {
    await apiFetch(`/api/items/${id}/tags`, {
      method: isFavorite ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: FAVORITE_TAG }),
    })
    showToast(isFavorite ? 'Removed from favorites' : 'Added to favorites')
    // Silent: a full reload would blank the grid mid-interaction.
    fetchItems({ silent: true })
  }

  const handleDelete = async () => {
    const id = pendingDeleteId
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
    setAllItems((prev) => prev.filter((i) => i.id !== id))
    showToast('Item deleted')
  }

  const handleCopyLink = async (item) => {
    const url = sourceUrl(item)
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      showToast('Source link copied')
    } catch {
      showToast('Could not copy link')
    }
  }

  // "Ask about this" opens the item, which already carries its own chat panel —
  // better than dropping the question into the global chat with no context.
  const handleAsk = (id) => navigate(`/library/${id}`)

  const emptyVariant = () => {
    if (items.length === 0) return 'no-content'
    if (filters.favoritesOnly && !search.trim() && !category && activeCount === 1) return 'no-favorites'
    if (category && !search.trim() && activeCount === 0) return 'empty-category'
    return 'no-results'
  }

  const emptyAction = () => {
    if (items.length === 0) return () => setAddOpen(true)
    return resetAll
  }

  // `showTitle` is off inside the drawer, which supplies its own header — two
  // "Filters" headings stacked on top of each other otherwise.
  const filterPanel = (showTitle) => (
    <FilterPanel
      filters={filters}
      onChange={setFilters}
      counts={categoryCounts}
      selectedCategory={category}
      onSelectCategory={setCategory}
      showTitle={showTitle}
    />
  )

  return (
    <div className="relative">
      {/* `isolate` is scoped to the header, not the page.
          The flourish sits at -z-10 and needs a local stacking context or it
          disappears behind the app background — but putting that context on the
          page root also traps the filter drawer and the Add Content modal
          inside it, letting the mobile nav's z-40 paint over their z-50. */}
      <div className="absolute inset-x-0 top-0 isolate">
        <LibraryFlourish />
      </div>

      <header className="relative mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[30px]">
            Library
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary"
            >
              <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </span>
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            All your saved content in one place. Search, filter and revisit what matters.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => (window.innerWidth >= 1280 ? setRailOpen((v) => !v) : setDrawerOpen(true))}
            aria-label="Filters"
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium shadow-card ring-1 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              activeCount > 0
                ? 'bg-primary-light text-primary ring-primary/20'
                : 'bg-surface text-text-primary ring-border-subtle hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
            Filter
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-card transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2} /> Add Content
          </button>
        </div>
      </header>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <SearchBar value={search} onChange={setSearch} />

          <div className="mt-3.5">
            <CategoryPills
              counts={categoryCounts}
              total={items.length}
              selected={category}
              onSelect={setCategory}
            />
          </div>

          <div className="mb-3 mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-caption text-text-secondary" aria-live="polite">
              {loading ? (
                'Loading…'
              ) : isNarrowed ? (
                <>
                  <span className="font-semibold text-text-primary">{visibleItems.length}</span> of {items.length}{' '}
                  {items.length === 1 ? 'item' : 'items'}
                </>
              ) : (
                <>
                  <span className="font-semibold text-text-primary">{items.length}</span>{' '}
                  {items.length === 1 ? 'item' : 'items'}
                </>
              )}
              {isNarrowed && (
                <button
                  onClick={resetAll}
                  className="ml-2 rounded-md px-1 font-medium text-primary transition-colors duration-150 hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Clear
                </button>
              )}
            </p>

            {/* One toolbar shell rather than two floating chips. A future
                density control is another segment after a divider — no
                placeholder is rendered for it, since a visible control that
                does nothing is worse than no control. */}
            <div className="inline-flex items-center rounded-xl bg-surface p-0.5 shadow-raised ring-1 ring-border-subtle">
              <label className="relative hidden items-center sm:flex">
                <span className="sr-only">Sort by</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pl-2.5 pr-7 text-caption font-medium text-text-primary transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {SORTS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-text-secondary"
                  strokeWidth={2}
                />
              </label>

              <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-border-subtle sm:block" />

              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">Error: {error}</p>
          )}

          {loading ? (
            <LibrarySkeleton
              view={view}
              count={view === 'list' ? 6 : 8}
              className={view === 'list' ? LIST_CLASSES : GRID_CLASSES[railOpen ? 'open' : 'closed']}
            />
          ) : visibleItems.length === 0 && !error ? (
            <EmptyState
              variant={emptyVariant()}
              detail={emptyVariant() === 'empty-category' ? category : null}
              onAction={emptyAction()}
            />
          ) : (
            // Keyed on view so switching remounts the list and replays the
            // entrance — that's the crossfade between grid and list.
            <ul
              key={view}
              className={view === 'list' ? LIST_CLASSES : GRID_CLASSES[railOpen ? 'open' : 'closed']}
            >
              {/* popLayout takes exiting cards out of flow while they fade, so
                  the survivors slide into the freed slots instead of jumping
                  the instant a filter drops a card. */}
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleItems.map((item, i) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    view={view}
                    isFavorite={item.tags?.some((t) => t.tag === FAVORITE_TAG)}
                    isNew={item.id === newItemId}
                    // Stagger only the first screenful; past that it's just a
                    // delay before the user sees their content.
                    delay={Math.min(i, 11) * 25}
                    onOpen={(id) => navigate(`/library/${id}`)}
                    onToggleFavorite={handleToggleFavorite}
                    onDelete={(id) => setPendingDeleteId(id)}
                    onAsk={handleAsk}
                    onCopyLink={sourceUrl(item) ? handleCopyLink : undefined}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {railOpen && (
          <aside aria-label="Filters" className="hidden w-[220px] shrink-0 animate-slideInRight xl:block">
            {loading ? <FilterSkeleton /> : filterPanel(true)}
          </aside>
        )}
      </div>

      {/* Below xl the rail becomes a drawer rather than disappearing.
          z-50 matches Modal — at the mobile nav's z-40 the nav drew on top of
          it, leaving a live navigation bar over a modal surface. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-text-primary/20 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute right-0 top-0 flex h-full w-[300px] max-w-[86vw] animate-slideInRight flex-col bg-bg-app shadow-card-hover"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <h2 className="text-[15px] font-semibold text-text-primary">Filters</h2>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors duration-150 hover:bg-muted hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-24">{filterPanel(false)}</div>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Content" size="xl">
        <AddContentFlow
          // Already on Library — refetch in place and flag the new item rather
          // than navigating to the page we're standing on.
          onSaved={() => fetchItems({ markNewest: true, silent: true })}
          onNavigate={(to) => {
            setAddOpen(false)
            if (to !== '/library') navigate(to)
          }}
        />
      </Modal>

      <ConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This permanently removes the item, its summary, embedding, and any tags. This can't be undone."
      />
    </div>
  )
}

export default Library
