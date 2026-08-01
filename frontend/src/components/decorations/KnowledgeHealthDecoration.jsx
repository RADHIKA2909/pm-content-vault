// Small decorative accent — an upward trend line, echoing "growing
// knowledge" for the Knowledge Health card.
function KnowledgeHealthDecoration() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -right-2 -top-2 h-20 w-24 opacity-90"
      aria-hidden="true"
    >
      <path d="M8 78 L34 78 L34 55 L8 55 Z" fill="#FFF1E6" />
      <path d="M40 78 L66 78 L66 40 L40 40 Z" fill="#EAF0FE" />
      <path d="M72 78 L92 78 L92 22 L72 22 Z" fill="#F0FBF7" />
      <path
        d="M12 60 L45 42 L70 50 L90 20"
        fill="none"
        stroke="#3B5FE3"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <circle cx="90" cy="20" r="4.5" fill="#F97316" />
    </svg>
  )
}

export default KnowledgeHealthDecoration
