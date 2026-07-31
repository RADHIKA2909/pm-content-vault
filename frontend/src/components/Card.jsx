function Card({ children, className = '', hover = false, onClick, as: Component = 'div' }) {
  return (
    <Component
      onClick={onClick}
      className={`rounded-2xl border border-border-subtle bg-surface p-5 ${
        hover ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </Component>
  )
}

export default Card
