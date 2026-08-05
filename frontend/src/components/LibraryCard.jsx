import { forwardRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Clock, Highlighter, History, Sparkles } from 'lucide-react'
import { CategoryChip, DuplicateChip } from './Chip.jsx'
import SourceThumbnail from './SourceThumbnail.jsx'
import CardHero from './library/CardHero.jsx'
import FavoriteButton from './library/FavoriteButton.jsx'
import CardMenu from './library/CardMenu.jsx'
import { itemCategories } from '../lib/categories.js'
import { describeItem } from '../lib/cardIntel.js'

// `onAsk` and `onCopyLink` are optional: Favorites reuses this card and passes
// only what it supports, and CardMenu drops any entry with no handler.
//
// forwardRef is required, not stylistic: AnimatePresence's popLayout mode
// attaches a ref to its direct child to measure the card before lifting it out
// of flow. A plain function component silently drops that ref and the exit
// animation mispositions.
// `footerNote`, `selectable`, `selected` and `onSelect` are additive and all
// default to off, so Library and the Ask My Vault examples render exactly as
// they did before Favorites existed. This card is shared; changing it for one
// page would change it for all three.
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
    footerNote = null,
    hoverOpen = false,
    selectable = false,
    selected = false,
    onSelect,
  },
  ref,
) {
  const categories = itemCategories(item)
  // Everything type-specific — which hero, which badge, which numbers — comes
  // from one place, so a new content type is an entry in lib/cardIntel.js
  // rather than another branch scattered through this component.
  const card = describeItem(item)
  const headline = card.title
  const support = card.subtitle

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
  // A grid card lifts further than a list row: it has the room, and in a grid
  // the lift is the only thing separating the card under the pointer from the
  // eight around it.
  const lift = view === 'list' ? -2 : -4
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

  // While selecting, clicking a card toggles it instead of navigating away —
  // the one thing that reliably ruins a bulk selection is losing the page
  // halfway through building it.
  const open = () => (selectable ? onSelect?.(item.id) : onOpen(item.id))

  const checkbox = selectable && (
    <span
      aria-hidden="true"
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 transition-colors duration-200 ${
        selected ? 'bg-primary text-white ring-primary' : 'bg-surface/95 ring-border-subtle'
      }`}
    >
      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  )
  const shared = {
    isFavorite,
    onOpen: open,
    onAsk: onAsk && (() => onAsk(item.id)),
    onCopyLink: onCopyLink && (() => onCopyLink(item)),
    onToggleFavorite: onToggleFavorite && (() => onToggleFavorite(item.id, isFavorite)),
    onDelete: onDelete && (() => onDelete(item.id)),
  }

  // The just-saved item gets a ring so it's findable in a full grid without
  // having to scan dates. A selected card takes the same treatment, since both
  // mean "this one, out of all of these".
  const outline =
    selected || isNew ? 'ring-2 ring-primary' : 'ring-1 ring-border-subtle'

  // Raise the whole card while its overflow menu is open.
  //
  // The hover lift is a real transform (Framer's whileHover), and a transform
  // creates a stacking context — which traps the menu's z-30 inside this card,
  // so the next card in DOM order paints straight over the open menu. Lifting
  // the card itself is what escapes that; z-index applies here without
  // `position` because these are grid/flex items.
  const raised = 'relative has-[[aria-expanded=true]]:z-20'

  // "Website · 5 min read", "PDF · 12 pages", "My note · 240 words" — each
  // entry omitted when the item has no value for it, so nothing ever reads
  // "0 pages".
  // Separators trail their entry rather than lead the next one. These rows
  // wrap on narrow cards, and a leading separator becomes a line that starts
  // "· Saved 4h ago", which reads as a typo. Trailing means a wrap can only
  // ever leave one at the end of a line, where it looks like continuation.
  //
  // `trailing` extends that across the boundary into the footer, which is a
  // sibling element and would otherwise supply its own leading separator.
  const renderMeta = (trailing = false) => (
    <span className="flex min-w-0 items-center gap-1.5 text-caption text-text-secondary">
      {card.meta.map((entry, i) => (
        <span key={entry} className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{entry}</span>
          {(trailing || i < card.meta.length - 1) && <span aria-hidden="true">·</span>}
        </span>
      ))}
    </span>
  )

  const meta = renderMeta()

  const FOOTER_ICON = { highlight: Highlighter, deadline: Clock, saved: Clock }

  // footerNote wins when a page passes one — Favorites relies on that for its
  // "Starred 4h ago", and it should keep saying that rather than a save date.
  const footer = footerNote
    ? [{ icon: 'saved', text: footerNote }]
    : card.footer

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
        className={`group flex cursor-pointer items-center gap-4 rounded-2xl bg-surface p-3 shadow-raised transition-shadow duration-200 hover:shadow-lifted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${raised} ${outline}`}
      >
        {selectable && checkbox}

        <div className="h-[58px] w-[86px] shrink-0 overflow-hidden rounded-xl bg-muted">
          <div className="h-full w-full transition-[transform,filter] duration-300 group-hover:scale-[1.03] group-hover:brightness-[1.06]">
            <SourceThumbnail item={item} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium text-text-primary">{headline}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* The separator between meta and footer is emitted by the meta
                group as a trailing mark, so wrapping can't push it onto the
                front of the footer's line. */}
            {renderMeta(card.meta.length > 0 && footer.length > 0)}
            {footer.map(({ text }) => (
              <span key={text} className="flex items-center gap-2 text-caption text-text-secondary">
                {text}
              </span>
            ))}
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
      className={`group flex h-full cursor-pointer flex-col rounded-2xl bg-surface shadow-raised transition-shadow duration-200 hover:shadow-lifted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${raised} ${outline}`}
    >
      {/* Clipping lives here, not on the card, so the overflow menu can escape
          the card's bounds. */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-muted">
        <div className="h-full w-full transition-[transform,filter] duration-300 group-hover:scale-[1.03] group-hover:brightness-[1.06]">
          <CardHero item={item} descriptor={card} />
        </div>

        {/* Sits between the picture and the badges, and outside the wrapper
            that scales on hover so it stays put while the image zooms under
            it. Only over real artwork — see descriptor.hasArtwork. */}
        {card.hasArtwork && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 via-black/10 to-transparent"
          />
        )}

        {/* Where it came from, stated on the artwork. For an article that's
            the domain, which is the fastest way to recognise a saved link. */}
        <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
          <span className="inline-flex max-w-[150px] items-center gap-1 rounded-lg bg-surface/95 px-2 py-1 text-[11px] font-medium text-text-primary shadow-card backdrop-blur-sm">
            <span className="truncate">{card.badge}</span>
          </span>
          {card.isNew && (
            <span
              title="Saved in the last day"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-1.5 py-1 text-[10px] font-semibold text-white shadow-card"
            >
              <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} /> New
            </span>
          )}
        </span>


        {selectable && <span className="absolute right-2 top-2">{checkbox}</span>}

        {/* Opt-in: the Library's whole card is already obviously clickable in a
            page of nothing but cards. On Favorites, where cards sit beside
            panels and a selection mode, saying so is worth the pixels. */}
        {hoverOpen && !selectable && (
          // No scrim. One was there and it fought the brightening underneath —
          // the two cancelled out and the thumbnail read as *dimmer* on hover.
          // The pill carries its own contrast instead: solid surface, a ring so
          // it stays defined on a pale thumbnail, and a shadow so it does on a
          // busy one.
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-text-primary shadow-card-hover ring-1 ring-border-subtle transition-transform duration-200 group-hover:translate-y-0">
              Open
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {card.meta.length > 0 && <div className="mb-1.5 flex items-center gap-2">{meta}</div>}

        <p className="truncate text-[15px] font-semibold text-text-primary">{headline}</p>
        {support && <p className="mt-0.5 truncate text-caption text-text-secondary">{support}</p>}

        {(categories.length > 0 || item.duplicateOf) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {/* Beside the categories rather than on the artwork: it's a label
                about the item, and every corner of the hero is now spoken for
                by the type badge, the New pill or a generated cover's title. */}
            {item.duplicateOf && <DuplicateChip similarity={item.duplicateOf.similarity} />}
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
            {/* Fills the dead space between the star and the menu. Favorites
                passes "Starred 4h ago"; Library passes nothing and the row
                looks exactly as it always has. */}
            {footer.map(({ icon, text }) => {
              const Icon = FOOTER_ICON[icon]
              return (
                <span key={text} className="flex min-w-0 items-center gap-1 text-[11px] text-text-secondary">
                  <Icon className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{text}</span>
                </span>
              )
            })}
            {card.revisited && !footerNote && (
              <History
                title="You came back to this recently"
                className="h-3 w-3 shrink-0 text-primary"
                strokeWidth={1.75}
              />
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
