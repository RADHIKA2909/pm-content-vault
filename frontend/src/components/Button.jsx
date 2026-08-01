const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'bg-white text-text-primary border border-border-subtle hover:bg-muted',
  ghost: 'text-text-secondary hover:bg-muted hover:text-text-primary',
  danger: 'bg-warning text-white hover:opacity-90',
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
