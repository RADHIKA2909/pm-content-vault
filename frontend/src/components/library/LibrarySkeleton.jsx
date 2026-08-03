import { SkeletonLine } from '../Skeleton.jsx'

// Deliberately shaped like the card it stands in for — same radius, same
// thumbnail ratio, same line positions. A skeleton that doesn't match causes
// the page to jump when the data lands, which is worse than no skeleton.
function GridSkeleton() {
  return (
    <li className="flex h-full flex-col rounded-2xl bg-surface shadow-card ring-1 ring-border-subtle">
      <div className="aspect-[16/10] w-full animate-pulse rounded-t-2xl bg-muted" />
      <div className="flex flex-1 flex-col p-4">
        <SkeletonLine className="mb-2.5 h-3 w-24" />
        <SkeletonLine className="mb-2 h-4 w-full" />
        <SkeletonLine className="h-3 w-2/3" />
        <div className="mt-3 flex gap-1.5">
          <SkeletonLine className="h-5 w-20 rounded-full" />
          <SkeletonLine className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </li>
  )
}

function ListSkeleton() {
  return (
    <li className="flex items-center gap-4 rounded-2xl bg-surface p-3 shadow-card ring-1 ring-border-subtle">
      <div className="h-[58px] w-[86px] shrink-0 animate-pulse rounded-xl bg-muted" />
      <div className="min-w-0 flex-1">
        <SkeletonLine className="mb-2 h-4 w-1/3" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </li>
  )
}

function LibrarySkeleton({ view = 'grid', count = 8, className = '' }) {
  const Item = view === 'list' ? ListSkeleton : GridSkeleton
  return (
    <ul aria-hidden="true" className={className}>
      {Array.from({ length: count }, (_, i) => (
        <Item key={i} />
      ))}
    </ul>
  )
}

// Stand-in for the filter rail, so the two-column layout doesn't assemble
// itself in front of the user.
export function FilterSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
        <SkeletonLine className="mb-4 h-4 w-20" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mb-3">
            <SkeletonLine className="mb-1.5 h-3 w-16" />
            <SkeletonLine className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-4 shadow-card ring-1 ring-border-subtle">
        <SkeletonLine className="mb-3 h-4 w-24" />
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonLine key={i} className="mb-2.5 h-6 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export default LibrarySkeleton
