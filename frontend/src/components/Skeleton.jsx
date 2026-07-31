export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5">
      <SkeletonLine className="mb-3 h-3 w-24" />
      <SkeletonLine className="mb-2 h-3.5 w-full" />
      <SkeletonLine className="h-3.5 w-2/3" />
    </div>
  )
}
