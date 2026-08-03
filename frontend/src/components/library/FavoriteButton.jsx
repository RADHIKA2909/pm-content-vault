import { Star } from 'lucide-react'

// The star overshoots once when it fills, then settles. `key` is bound to the
// state so React remounts the icon on change, which is what replays the
// keyframe — re-adding a class to a live node does not.
//
// Only the fill animates. Un-favouriting is an undo, not an achievement, so it
// just fades back to the outline.
function FavoriteButton({ isFavorite, onToggle, className = '' }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <Star
        key={String(isFavorite)}
        className={`h-[17px] w-[17px] transition-colors duration-200 ${
          isFavorite ? 'animate-pop fill-accent text-accent' : 'text-text-secondary'
        }`}
        strokeWidth={1.75}
      />
    </button>
  )
}

export default FavoriteButton
