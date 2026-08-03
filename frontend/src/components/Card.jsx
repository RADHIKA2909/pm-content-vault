import { forwardRef } from 'react'

// forwardRef so a caller can measure the card — the item page tracks reading
// progress against the height of the article card itself.
const Card = forwardRef(function Card(
  { children, className = '', hover = false, onClick, as: Component = 'div' },
  ref,
) {
  return (
    <Component
      ref={ref}
      onClick={onClick}
      className={`rounded-2xl border border-border-subtle bg-surface p-5 ${
        hover ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </Component>
  )
})

export default Card
