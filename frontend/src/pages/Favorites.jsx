import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { CheckSquare, ChevronDown, Star } from 'lucide-react'
import { apiFetch } from '../lib/apiFetch.js'
import { useToast } from '../components/ToastContext.jsx'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { FAVORITE_TAG, itemCategories } from '../lib/categories.js'
import { FAVORITE_SORTS, sortFavorites, starredAt, sourceUrl } from '../lib/itemFilters.js'
import { savedAgo } from '../lib/relativeTime.js'
import { exportFavorites } from '../lib/favoritesExport.js'
import LibraryCard from '../components/LibraryCard.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import Modal from '../components/Modal.jsx'
import CategoryPicker from '../components/CategoryPicker.jsx'
import CategoryPills from '../components/library/CategoryPills.jsx'
import ViewToggle from '../components/library/ViewToggle.jsx'
import EmptyState from '../components/library/EmptyState.jsx'
import LibrarySkeleton from '../components/library/LibrarySkeleton.jsx'
import FavoriteStats from '../components/favorites/FavoriteStats.jsx'
import SelectionToolbar from '../components/favorites/SelectionToolbar.jsx'
import StudyPanel from '../components/favorites/StudyPanel.jsx'
import FavoritesCallout from '../components/favorites/FavoritesCallout.jsx'

// Written out in full rather than assembled from `railOpen`. Tailwind scans
// source text, so a runtime-built class name never reaches the compiled CSS.
const GRID_WITH_RAIL =
  'grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4'
const GRID_FULL =
  'grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1700px]:grid-cols-5'
const LIST_CLASSES = 'flex flex-col gap-2'

// Past this the grid fills the row on its own and the rail would just squeeze
// it. The brief's "panel disappears once the grid becomes large".
const RAIL_MAX_ITEMS = 3

function Favorites() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useLocalStorage('pmv.favorites.sort', 'starred')
  const [view, setView] = useLocalStorage('pmv.favorites.view', 'grid')

  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  const navigate = useNavigate()
  const { showToast } = useToast()

  const fetchItems = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    const res = await apiFetch(`/api/items`)
    if (res.ok) setItems(await res.json())
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const favorites = useMemo(
    () => items.filter((item) => item.tags?.some((t) => t.tag === FAVORITE_TAG)),
    [items],
  )

  const categoryCounts = useMemo(() => {
    const counts = {}
    for (const item of favorites) {
      for (const c of itemCategories(item)) counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [favorites])

  const visible = useMemo(() => {
    const filtered = category
      ? favorites.filter((item) => itemCategories(item).includes(category))
      : favorites
    return sortFavorites(filtered, sort)
  }, [favorites, category, sort])

  const selected = useMemo(
    () => visible.filter((item) => selectedIds.has(item.id)),
    [visible, selectedIds],
  )

  // ── Selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const endSelecting = () => {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  // Each action is a straight loop over the existing single-item endpoints.
  // There is no bulk API, and inventing one for a handful of hand-picked rows
  // would be a schema and a route to maintain for no gain.
  const runOnSelected = async (fn, message) => {
    setBusy(true)
    try {
      await Promise.all(selected.map(fn))
      await fetchItems({ silent: true })
      showToast(message(selected.length))
      endSelecting()
    } catch {
      showToast('Something went wrong — nothing was changed', 'error')
    } finally {
      setBusy(false)
    }
  }

  const unfavorite = (item) =>
    apiFetch(`/api/items/${item.id}/tags`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: FAVORITE_TAG }),
    })

  const handleToggleFavorite = async (id) => {
    await unfavorite({ id })
    showToast('Removed from favorites')
    fetchItems({ silent: true })
  }

  const handleDelete = async () => {
    const id = pendingDeleteId
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
    showToast('Item deleted')
  }

  const handleExport = async () => {
    setBusy(true)
    try {
      const count = await exportFavorites(selected)
      showToast(`Exported ${count} ${count === 1 ? 'item' : 'items'}`)
    } catch {
      showToast('Could not build the export', 'error')
    } finally {
      setBusy(false)
    }
  }

  const applyCategory = async (categories) => {
    if (!categories.length) return
    setMoveOpen(false)
    await runOnSelected(
      (item) =>
        apiFetch(`/api/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories }),
        }),
      (n) => `Moved ${n} ${n === 1 ? 'item' : 'items'}`,
    )
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

  // "Starred 4h ago" normally; "Opened 2d ago" while sorting by opened, so the
  // footer explains the order you're looking at.
  const footerNote = (item) => {
    if (sort === 'opened') {
      return item.last_engaged_at ? `Opened ${savedAgo(item.last_engaged_at)}` : 'Not opened yet'
    }
    const at = starredAt(item)
    return at ? `Starred ${savedAgo(at)}` : null
  }

  const showRail = !loading && favorites.length > 0 && visible.length <= RAIL_MAX_ITEMS
  const gridClasses = view === 'list' ? LIST_CLASSES : showRail ? GRID_WITH_RAIL : GRID_FULL

  return (
    <div>
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold leading-tight tracking-tight text-text-primary sm:text-[30px]">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-light text-accent"
            >
              <Star className="h-[18px] w-[18px] fill-accent" strokeWidth={1.75} />
            </span>
            Favorites
          </h1>
          <p className="mt-1 text-body text-text-secondary">
            Your most important knowledge, collected in one place.
          </p>
        </div>

        {/* The selection toolbar takes over this row rather than stacking above
            it, so ticking a card never pushes the grid down. */}
        <div className="min-w-0 shrink-0 lg:max-w-[640px]">
          <AnimatePresence mode="wait" initial={false}>
            {selecting ? (
              <SelectionToolbar
                key="selection"
                count={selected.length}
                total={visible.length}
                busy={busy}
                onSelectAll={() => setSelectedIds(new Set(visible.map((i) => i.id)))}
                onClear={endSelecting}
                onRemove={() =>
                  runOnSelected(unfavorite, (n) => `Removed ${n} from favorites`)
                }
                onMove={() => setMoveOpen(true)}
                onExport={handleExport}
                onDelete={() => setBulkDeleteOpen(true)}
              />
            ) : (
              <div key="actions" className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-xl bg-surface p-0.5 shadow-raised ring-1 ring-border-subtle">
                  <ViewToggle view={view} onChange={setView} />
                  <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border-subtle" />
                  <label className="relative flex items-center">
                    <span className="sr-only">Sort by</span>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="cursor-pointer appearance-none rounded-lg bg-transparent py-1.5 pl-2.5 pr-7 text-caption font-medium text-text-primary transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {FAVORITE_SORTS.map((o) => (
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
                </div>

                <button
                  onClick={() => setSelecting(true)}
                  disabled={!favorites.length}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-sm font-medium text-text-primary shadow-card ring-1 ring-border-subtle transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"
                >
                  <CheckSquare className="h-4 w-4" strokeWidth={1.75} /> Select
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {!loading && favorites.length > 0 && (
        <>
          <FavoriteStats favorites={favorites} />

          <div className="mb-4 mt-5">
            <CategoryPills
              counts={categoryCounts}
              total={favorites.length}
              selected={category}
              onSelect={setCategory}
            />
          </div>
        </>
      )}

      {loading ? (
        <LibrarySkeleton view={view} count={4} className={gridClasses} />
      ) : favorites.length === 0 ? (
        <EmptyState
          variant="no-favorites"
          body="Star important notes, frameworks and articles and they'll collect here, ready for the next mock interview."
          actionLabel="Browse Library"
          onAction={() => navigate('/library')}
        />
      ) : (
        <div className={showRail ? 'flex flex-col gap-4 xl:flex-row xl:items-start' : ''}>
          <div className="min-w-0 flex-1">
            {visible.length === 0 ? (
              <EmptyState variant="empty-category" detail={category} onAction={() => setCategory('')} />
            ) : (
              <ul key={view} className={gridClasses}>
                <AnimatePresence mode="popLayout" initial={false}>
                  {visible.map((item, i) => (
                    <LibraryCard
                      key={item.id}
                      item={item}
                      view={view}
                      isFavorite
                      delay={Math.min(i, 11) * 30}
                      footerNote={footerNote(item)}
                      hoverOpen
                      selectable={selecting}
                      selected={selectedIds.has(item.id)}
                      onSelect={toggleSelect}
                      onOpen={(id) => navigate(`/library/${id}`)}
                      onToggleFavorite={handleToggleFavorite}
                      onDelete={(id) => setPendingDeleteId(id)}
                      onAsk={(id) => navigate(`/library/${id}`)}
                      onCopyLink={sourceUrl(item) ? handleCopyLink : undefined}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          {/* Sticky so it stays with you down a long grid. `xl:items-start` on
              the flex row above is what makes that possible — a stretched flex
              item is already as tall as its container and has nowhere to stick
              to. */}
          {showRail && (
            <div className="w-full shrink-0 xl:sticky xl:top-5 xl:w-[300px]">
              <StudyPanel favorites={favorites} />
            </div>
          )}
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <FavoritesCallout onAsk={() => navigate('/chat')} />
      )}

      <Modal open={moveOpen} onClose={() => setMoveOpen(false)} title="Move to category">
        <p className="mb-3 text-caption text-text-secondary">
          {/* Says "replaces" out loud: the endpoint sets categories wholesale,
              and "move" could reasonably be read as "add to". */}
          This replaces the categories on {selected.length}{' '}
          {selected.length === 1 ? 'item' : 'items'}.
        </p>
        <CategoryPicker value={[]} onChange={applyCategory} label="" showChips={false} />
      </Modal>

      <ConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete this item?"
        description="This permanently removes the item, its summary, embedding, highlights and any tags. This can't be undone."
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={() =>
          runOnSelected(
            (item) => apiFetch(`/api/items/${item.id}`, { method: 'DELETE' }),
            (n) => `Deleted ${n} ${n === 1 ? 'item' : 'items'}`,
          )
        }
        title={`Delete ${selected.length} ${selected.length === 1 ? 'item' : 'items'}?`}
        description="This permanently removes them from your vault — not just from favorites — along with their summaries, embeddings and highlights. This can't be undone."
      />
    </div>
  )
}

export default Favorites
