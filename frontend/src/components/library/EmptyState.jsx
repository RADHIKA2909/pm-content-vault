import { Plus, RotateCcw, Search, Sparkles, Star } from 'lucide-react'

// Line-art illustrations, drawn in `currentColor` at low opacity so they carry
// the page's palette instead of importing a second one.
function BoxArt() {
  return (
    <svg viewBox="0 0 120 96" fill="none" className="h-24 w-28 text-primary">
      <rect x="22" y="38" width="76" height="46" rx="8" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path d="M22 52H98" stroke="currentColor" strokeWidth="2" opacity="0.22" />
      <rect x="48" y="44" width="24" height="6" rx="3" fill="currentColor" opacity="0.3" />
      <rect x="40" y="14" width="26" height="30" rx="5" fill="currentColor" opacity="0.14" transform="rotate(-11 53 29)" />
      <rect x="62" y="10" width="24" height="28" rx="5" fill="currentColor" opacity="0.2" transform="rotate(8 74 24)" />
      <circle cx="30" cy="20" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="96" cy="30" r="2.5" fill="currentColor" opacity="0.22" />
    </svg>
  )
}

function SearchArt() {
  return (
    <svg viewBox="0 0 120 96" fill="none" className="h-24 w-28 text-primary">
      <circle cx="54" cy="44" r="24" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <path d="M72 62L90 80" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      <path d="M44 44H64M44 52H58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <circle cx="26" cy="22" r="2.5" fill="currentColor" opacity="0.25" />
      <circle cx="96" cy="26" r="2" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

function FolderArt() {
  return (
    <svg viewBox="0 0 120 96" fill="none" className="h-24 w-28 text-primary">
      <path
        d="M24 32C24 29 26 27 29 27H48L55 35H91C94 35 96 37 96 40V72C96 75 94 77 91 77H29C26 77 24 75 24 72V32Z"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <path d="M24 48H96" stroke="currentColor" strokeWidth="2" opacity="0.18" />
      <circle cx="60" cy="62" r="2.5" fill="currentColor" opacity="0.25" />
      <circle cx="72" cy="62" r="2.5" fill="currentColor" opacity="0.25" />
      <circle cx="48" cy="62" r="2.5" fill="currentColor" opacity="0.25" />
    </svg>
  )
}

function StarArt() {
  return (
    <svg viewBox="0 0 120 96" fill="none" className="h-24 w-28 text-accent">
      <path
        d="M60 22L68 42L89 44L73 58L78 79L60 68L42 79L47 58L31 44L52 42L60 22Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <circle cx="28" cy="28" r="2.5" fill="currentColor" opacity="0.3" />
      <circle cx="94" cy="34" r="2" fill="currentColor" opacity="0.25" />
      <circle cx="90" cy="72" r="2.5" fill="currentColor" opacity="0.2" />
    </svg>
  )
}

const VARIANTS = {
  'no-content': {
    Art: BoxArt,
    title: 'Your vault is empty',
    body: 'Save a LinkedIn post, a PDF, a link or a note and it becomes searchable straight away.',
    actionLabel: 'Add your first resource',
    ActionIcon: Plus,
  },
  'no-results': {
    Art: SearchArt,
    title: 'No matches',
    body: 'Nothing here fits that search and filter combination. Try a broader term, or clear the filters.',
    actionLabel: 'Clear search and filters',
    ActionIcon: RotateCcw,
  },
  'empty-category': {
    Art: FolderArt,
    title: 'Nothing filed here yet',
    body: 'This category has no saved content. Add something, or browse everything instead.',
    actionLabel: 'Show all items',
    ActionIcon: Search,
  },
  'no-favorites': {
    Art: StarArt,
    title: 'No favorites yet',
    body: 'Star anything you want to revisit before a mock interview and it will collect here.',
    actionLabel: 'Show all items',
    ActionIcon: Sparkles,
  },
}

// `actionLabel` and `body` can be overridden because the same variant is used
// from two places with two different actions: Library's favourites filter
// clears back to everything ("Show all items"), while the Favorites page sends
// you somewhere else entirely ("Browse Library"). One label can't be right for
// both, and a button that misnames where it goes is worse than a plain one.
function EmptyState({ variant, detail, onAction, actionLabel: labelOverride, body: bodyOverride }) {
  const config = VARIANTS[variant] || VARIANTS['no-results']
  const { Art, title, ActionIcon } = config
  const body = bodyOverride || config.body
  const actionLabel = labelOverride || config.actionLabel

  return (
    <div className="flex animate-cardIn flex-col items-center justify-center rounded-2xl bg-surface px-6 py-14 text-center shadow-card ring-1 ring-border-subtle">
      <Art />
      <h3 className="mt-4 text-[17px] font-semibold text-text-primary">
        {title}
        {detail && <span className="text-text-secondary"> · {detail}</span>}
      </h3>
      <p className="mt-1.5 max-w-sm text-body text-text-secondary">{body}</p>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <ActionIcon className="h-4 w-4" strokeWidth={2} />
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default EmptyState
