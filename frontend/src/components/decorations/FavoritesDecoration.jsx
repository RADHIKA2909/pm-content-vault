// Small decorative accent — a soft star burst, echoing the favorites
// concept for the Dashboard's favorites card.
function FavoritesDecoration() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 opacity-90"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="38" fill="#FFF1E6" />
      <path
        d="M50 16a34 34 0 1 1-24 10"
        fill="none"
        stroke="#F97316"
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.3"
      />
      <path
        d="M50 34l4.5 9.2 10.1 1.5-7.3 7.1 1.7 10-9-4.7-9 4.7 1.7-10-7.3-7.1 10.1-1.5z"
        fill="#F97316"
      />
    </svg>
  )
}

export default FavoritesDecoration
