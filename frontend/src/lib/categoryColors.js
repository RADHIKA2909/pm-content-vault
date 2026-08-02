// The six taxonomy categories get fixed colours so they stay recognisable at a
// glance across sessions.
export const CATEGORY_COLORS = {
  'Interview Questions': 'bg-primary-light text-primary',
  'Job Postings': 'bg-secondary/10 text-secondary',
  'Application Tips': 'bg-warning/10 text-warning',
  Frameworks: 'bg-success/10 text-success',
  'Industry News': 'bg-accent-light text-accent',
  Other: 'bg-violet-100 text-violet-700',
}

// Custom categories draw from here. Written as complete literal class strings
// because Tailwind scans source text — anything assembled at runtime (e.g.
// `bg-${name}-100`) would never make it into the compiled CSS.
const CUSTOM_PALETTE = [
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-indigo-100 text-indigo-700',
  'bg-lime-100 text-lime-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
]

// Same name always lands on the same colour, without needing to store one.
function hash(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0
  }
  return value
}

export function categoryColor(category) {
  if (!category) return CATEGORY_COLORS.Other
  return CATEGORY_COLORS[category] || CUSTOM_PALETTE[hash(category.toLowerCase()) % CUSTOM_PALETTE.length]
}
