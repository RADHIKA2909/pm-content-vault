import { Copy } from 'lucide-react'
import { categoryColor } from '../lib/categoryColors.js'

export function CategoryChip({ category }) {
  if (!category) return null
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-caption font-medium ${categoryColor(category)}`}>
      {category}
    </span>
  )
}

export function DuplicateChip({ similarity }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-caption font-medium text-warning">
      <Copy className="h-3 w-3" />
      {Math.round(similarity * 100)}% similar
    </span>
  )
}

export function Chip({ children, className = '' }) {
  return (
    <span className={`rounded-full bg-muted px-2.5 py-0.5 text-caption text-text-secondary ${className}`}>
      {children}
    </span>
  )
}
