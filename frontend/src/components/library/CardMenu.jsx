import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link2, MessageSquare, MoreHorizontal, SquareArrowOutUpRight, Star, StarOff, Trash2 } from 'lucide-react'

// Overflow menu for a card.
//
// Entries are built from the handlers actually passed in, so an action that
// isn't available for an item simply isn't listed — "Copy link" disappears for
// a hand-written note, which has no URL to copy. A menu item that does nothing
// is worse than a missing one.
function CardMenu({ isFavorite, onOpen, onAsk, onCopyLink, onToggleFavorite, onDelete }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Open upward when there isn't room below.
  //
  // The menu lives in the card's footer, so for the last row of the grid
  // "below" is off the bottom of the page — the menu opened into space that
  // had to be scrolled to before anything in it could be clicked.
  //
  // useLayoutEffect, not useEffect: this runs before the browser paints, so
  // the menu is already in the right place on its first frame rather than
  // appearing downward and jumping up.
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !buttonRef.current) return

    const button = buttonRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current.offsetHeight
    const GAP = 12

    const roomBelow = window.innerHeight - button.bottom
    const roomAbove = button.top

    // Only flip if flipping actually helps — on a very short viewport neither
    // side fits, and dropping up would be no better while feeling erratic.
    setDropUp(roomBelow < menuHeight + GAP && roomAbove > roomBelow)
  }, [open])

  // A menu anchored to a card that scrolls away shouldn't hang in mid-air.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [open])

  const items = [
    onOpen && { key: 'open', label: 'Open', Icon: SquareArrowOutUpRight, run: onOpen },
    onAsk && { key: 'ask', label: 'Ask about this', Icon: MessageSquare, run: onAsk },
    onCopyLink && { key: 'copy', label: 'Copy source link', Icon: Link2, run: onCopyLink },
    onToggleFavorite && {
      key: 'fav',
      label: isFavorite ? 'Remove from favorites' : 'Add to favorites',
      Icon: isFavorite ? StarOff : Star,
      run: onToggleFavorite,
    },
    onDelete && { key: 'delete', label: 'Delete', Icon: Trash2, run: onDelete, danger: true },
  ].filter(Boolean)

  if (items.length === 0) return null

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        // Always visible. It used to reveal on hover, which hid the only route
        // to Open / Ask / Copy link / Delete behind a gesture that doesn't
        // exist on touch — and left every card looking like it had no actions.
        // Muted at rest and darkening on hover keeps it quiet without hiding it.
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
          open ? 'bg-muted text-text-primary' : 'text-text-secondary/70 hover:text-text-primary'
        }`}
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 z-30 w-52 animate-menuIn overflow-hidden rounded-xl bg-surface p-1 shadow-card-hover ring-1 ring-border-subtle ${
            dropUp ? 'bottom-full mb-1 origin-bottom-right' : 'top-full mt-1 origin-top-right'
          }`}
        >
          {items.map(({ key, label, Icon, run, danger }) => (
            <button
              key={key}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                run()
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors duration-150 focus:outline-none ${
                danger
                  ? 'text-warning hover:bg-warning/10 focus-visible:bg-warning/10'
                  : 'text-text-primary hover:bg-muted focus-visible:bg-muted'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CardMenu
