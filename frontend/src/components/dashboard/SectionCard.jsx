// Shared shell for the dashboard's larger sections: icon, title, subtitle, an
// optional link on the right, then content. Keeps heading rhythm and shadow
// identical across sections instead of four near-copies.
function SectionCard({ icon: Icon, title, subtitle, action, children, className = '', delay = 0 }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={`flex animate-fadeUp flex-col rounded-2xl bg-surface p-3.5 shadow-card ring-1 ring-border-subtle/70 ${className}`}
    >
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-snug tracking-tight text-text-primary">{title}</h2>
            {subtitle && <p className="mt-0.5 text-caption text-text-secondary">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>

      {children}
    </section>
  )
}

export default SectionCard
