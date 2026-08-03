import { Sparkles, Star } from 'lucide-react'

/**
 * The quiet line at the foot of the page.
 *
 * Onboarding, not advertising: it explains how favourites get here and where
 * they can go next, then gets out of the way. The actionable version of this
 * lives in the right rail — repeating those prompts down here would make the
 * page ask twice for the same click.
 */
function FavoritesCallout({ onAsk }) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card ring-1 ring-border-subtle/70">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light">
          <Sparkles className="h-4 w-4 text-primary" strokeWidth={1.75} />
        </span>

        {/* A min-width rather than min-w-0: with the latter the text shrinks
            indefinitely and the button stays glued alongside it, squeezing the
            copy into four wrapped lines on a phone. A floor makes the button
            wrap onto its own row instead. */}
        <span className="min-w-[220px] flex-1">
          <span className="block text-sm font-medium text-text-primary">
            Make favorites even more powerful
          </span>
          <span className="block text-caption text-text-secondary">
            Connect related ideas across what you've starred, or turn them into practice questions.
          </span>
        </span>

        <button
          onClick={onAsk}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary-light px-3 py-1.5 text-caption font-medium text-primary transition-colors duration-150 hover:bg-primary hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} /> Ask My Vault
        </button>
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-text-secondary">
        <Star className="h-3 w-3" strokeWidth={1.75} />
        Star anything from anywhere in the app to build your collection here.
      </p>
    </div>
  )
}

export default FavoritesCallout
