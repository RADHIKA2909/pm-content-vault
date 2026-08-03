import { forwardRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { CategoryChip, DuplicateChip } from './Chip.jsx'
import SourceBadge from './SourceBadge.jsx'
import SourceThumbnail from './SourceThumbnail.jsx'
import FavoriteButton from './library/FavoriteButton.jsx'
import CardMenu from './library/CardMenu.jsx'
import { parseTitle } from '../lib/parseTitle.js'
import { itemCategories } from '../lib/categories.js'
import { savedAgo } from '../lib/relativeTime.js'

// `onAsk` and `onCopyLink` are optional: Favorites reuses this card and passes
// only what it supports, and CardMenu drops any entry with no handler.
//
// forwardRef is required, not stylistic: AnimatePresence's popLayout mode
// attaches a ref to its direct child to measure the card before lifting it out
// of flow. A plain function component silently drops that ref and the exit
// animation mispositions.
const LibraryCard = forwardRef(function LibraryCard(
  {
    item,
    isFavorite,
    onOpen,
    onToggleFavorite,
    onDelete,
    onAsk,
    onCopyLink,
    view = 'grid',
    isNew = false,
    delay = 0,
  },
  ref,
) {
  const { title, subtitle } = parseTitle(item.title)
  const categories = itemCategories(item)
  const headline = title || item.summary || item.raw_content || 'Untitled'
  const support = title ? subtitle : null

  // Framer owns card entrance/exit/reflow now, so there is no CSS entrance
  // class here — two systems animating the same element fight each other.
  // `delay` staggers the first screenful; `layout` slides survivors into their
  // new grid positions when a filter removes cards around them.
  //
  // The hover lift is Framer's too, and deliberately so: `layout` writes an
  // inline `transform`, which would override a Tailwind `hover:-translate-y`
  // on the same element. The thumbnail zoom stays CSS because it lives on an
  // inner element Framer never touches.
  //
  // The stagger delay sits on `animate`, not the shared `transition`. At the
  // top level it would also delay `layout` and `whileHover`, so a card would
  // pause before sliding into its new slot, and hover would feel unresponsive.
  const reduceMotion = useReducedMotion()
  const lift = view === 'list' ? -1 : -3
  const motionProps = reduceMotion
    ? {}
    : {
        layout: true,
        initial: { opacity: 0, scale: 0.98, y: 4 },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.18, ease: 'easeOut', delay: delay / 1000 },
        },
        exit: { opacity: 0, scale: 0.97, transition: { duration: 0.13, ease: 'easeIn' } },
        transition: { duration: 0.22, ease: 'easeOut' },
        whileHover: { y: lift, transition: { duration: 0.2, ease: 'easeOut' } },
      }

  const open = () => onOpen(item.id)
  const shared = {
    isFavorite,
    onOpen: open,
    onAsk: onAsk && (() => onAsk(item.id)),
    onCopyLink: onCopyLink && (() => onCopyLink(item)),
    onToggleFavorite: onToggleFavorite && (() => onToggleFavorite(item.id, isFavorite)),
    onDelete: onDelete && (() => onDelete(item.id)),
  }

  // The just-saved item gets a ring so it's findable in a full grid without
  // having to scan dates.
  const outline = isNew ? 'ring-2 ring-primary' : 'ring-1 ring-border-subtle'

  // Raise the whole card while its overflow menu is open.
  //
  // The hover lift is a real transform (Framer's whileHover), and a transform
  // creates a stacking context — which traps the menu's z-30 inside this card,
  // so the next card in DOM order paints straight over the open menu. Lifting
  // the card itself is what escapes that; z-index applies here without
  // `position` because these are grid/flex items.
  const raised = 'relative has-[[aria-expanded=true]]:z-20'

  const meta = (
    <span className="flex shrink-0 items-center gap-1.5 text-caption text-text-secondary">
      <SourceBadge sourceType={item.source_type} linkType={item.link_type} />
      <span aria-hidden="true">·</span>
      <time dateTime={item.created_at}>{savedAgo(item.created_at)}</time>
    </span>
  )

  if (view === 'list') {
    return (
      <motion.li
        ref={ref}
        {...motionProps}
        onClick={open}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
        role="button"
        tabIndex={0}
        aria-label={headline}
        className={`group flex cursor-pointer items-center gap-4 rounded-2xl bg-surface p-3 shadow-raised transition-shadow duration-200 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${raised} ${outline}`}
      >
        <div className="h-[58px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <div className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]">
            <SourceThumbnail item={item} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-text-primary">{headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {meta}
            {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
            {categories.map((category) => (
              <CategoryChip key={category} category={category} />
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {onToggleFavorite && (
            <FavoriteButton isFavorite={isFavorite} onToggle={() => onToggleFavorite(item.id, isFavorite)} />
          )}
          <CardMenu {...shared} />
        </div>
      </motion.li>
    )
  }

  return (
    <motion.li
      ref={ref}
      {...motionProps}
      onClick={open}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open())}
      role="button"
      tabIndex={0}
      aria-label={headline}
      className={`group flex h-full cursor-pointer flex-col rounded-2xl bg-surface shadow-raised transition-shadow duration-200 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${raised} ${outline}`}
    >
      {/* Clipping lives here, not on the card, so the overflow menu can escape
          the card's bounds. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-muted">
        <div className="h-full w-full transition-transform duration-300 group-hover:scale-[1.02]">
          <SourceThumbnail item={item} />
        </div>

        {item.duplicateOf && (
          <span className="absolute left-2 top-2">
            <DuplicateChip similarity={item.duplicateOf.similarity} />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-2">{meta}</div>

        <p className="truncate text-[15px] font-semibold text-text-primary">{headline}</p>
        {support && <p className="mt-0.5 truncate text-caption text-text-secondary">{support}</p>}

        {categories.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <CategoryChip key={category} category={category} />
            ))}
          </div>
        )}

        {/* Pinned to the bottom so every card's action row lines up, whatever
            the title and chips above it did. The divider runs full-bleed
            (-mx-4 against the p-4 body) — inset, it read as a stray line
            rather than as the edge of a footer. */}
        {/* The pt-3 wrapper carries the gap. `mt-auto` alone collapses to zero
            on a card whose content fills the row, putting the rule flush
            against the category chips. */}
        <div className="mt-auto pt-3">
          <div className="-mx-4 -mb-1 flex items-center gap-0.5 border-t border-border-subtle px-3 pt-2">
            {onToggleFavorite && (
              <FavoriteButton isFavorite={isFavorite} onToggle={() => onToggleFavorite(item.id, isFavorite)} />
            )}
            <span className="ml-auto">
              <CardMenu {...shared} />
            </span>
          </div>
        </div>
      </div>
    </motion.li>
  )
})

export default LibraryCard
