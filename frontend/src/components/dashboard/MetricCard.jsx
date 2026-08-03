import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useCountUp } from '../../lib/useCountUp.js'

const TONES = {
  primary: 'bg-primary-light text-primary ring-primary/10',
  secondary: 'bg-secondary/10 text-secondary ring-secondary/10',
  warning: 'bg-warning/10 text-warning ring-warning/10',
  success: 'bg-success/10 text-success ring-success/10',
}

// `trend` is omitted rather than zeroed where the underlying history doesn't
// exist — see the Duplicates card. A metric with no honest delta shows none.
function TrendChip({ trend }) {
  if (trend === undefined || trend === null) return null

  const Icon = trend > 0 ? ArrowUpRight : trend < 0 ? ArrowDownRight : Minus
  const tone =
    trend > 0
      ? 'text-success bg-success/10'
      : trend < 0
        ? 'text-warning bg-warning/10'
        : 'text-text-secondary bg-muted'

  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" strokeWidth={2.25} />
      {Math.abs(trend)} this week
    </span>
  )
}

function MetricCard({ icon: Icon, label, value, description, trend, tone = 'primary', onClick, delay = 0 }) {
  const shown = useCountUp(value)
  const interactive = Boolean(onClick)

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      style={{ animationDelay: `${delay}ms` }}
      className={`group animate-fadeUp rounded-2xl bg-surface px-4 py-3 shadow-card ring-1 ring-border-subtle/70 transition-all duration-200 ${
        interactive
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-200 group-hover:scale-105 ${TONES[tone]}`}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-caption font-medium text-text-secondary">{label}</p>
          <p className="text-[26px] font-semibold leading-none tracking-tight text-text-primary">{shown}</p>
        </div>

        <TrendChip trend={trend} />
      </div>

      <p className="mt-1.5 truncate text-caption text-text-secondary">{description}</p>
    </div>
  )
}

export default MetricCard
