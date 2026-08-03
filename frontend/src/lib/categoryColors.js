// The six taxonomy categories get fixed colours so they stay recognisable at a
// glance across sessions.
//
// Every class below is written out in full. Tailwind scans source *text*, so
// anything assembled at runtime (`bg-${name}-100`) never reaches the compiled
// CSS and silently renders as no colour at all.
export const CATEGORY_COLORS = {
  'Interview Questions': 'bg-primary-light text-primary',
  'Job Postings': 'bg-secondary/10 text-secondary',
  'Application Tips': 'bg-warning/10 text-warning',
  Frameworks: 'bg-success/10 text-success',
  'Industry News': 'bg-accent-light text-accent',
  Other: 'bg-violet-100 text-violet-700',
}

// Much fainter wash of the same hue, for surfaces rather than chips.
// Keyed identically so a category's chip and its tile always agree.
const CATEGORY_TINTS = {
  'Interview Questions': 'bg-primary/[0.045] hover:bg-primary/[0.09]',
  'Job Postings': 'bg-secondary/[0.05] hover:bg-secondary/[0.1]',
  'Application Tips': 'bg-warning/[0.05] hover:bg-warning/[0.1]',
  Frameworks: 'bg-success/[0.05] hover:bg-success/[0.1]',
  'Industry News': 'bg-accent/[0.05] hover:bg-accent/[0.1]',
  Other: 'bg-violet-50 hover:bg-violet-100/70',
}

// Custom categories draw from here, paired by index with CUSTOM_TINTS.
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

const CUSTOM_TINTS = [
  'bg-rose-50 hover:bg-rose-100/70',
  'bg-cyan-50 hover:bg-cyan-100/70',
  'bg-indigo-50 hover:bg-indigo-100/70',
  'bg-lime-50 hover:bg-lime-100/70',
  'bg-fuchsia-50 hover:bg-fuchsia-100/70',
  'bg-sky-50 hover:bg-sky-100/70',
  'bg-teal-50 hover:bg-teal-100/70',
  'bg-orange-50 hover:bg-orange-100/70',
  'bg-purple-50 hover:bg-purple-100/70',
  'bg-emerald-50 hover:bg-emerald-100/70',
]

// Same name always lands on the same colour, without needing to store one.
function hash(text) {
  let value = 0
  for (let i = 0; i < text.length; i += 1) {
    value = (value * 31 + text.charCodeAt(i)) >>> 0
  }
  return value
}

const customIndex = (category) => hash(category.toLowerCase()) % CUSTOM_PALETTE.length

export function categoryColor(category) {
  if (!category) return CATEGORY_COLORS.Other
  return CATEGORY_COLORS[category] || CUSTOM_PALETTE[customIndex(category)]
}

export function categoryTint(category) {
  if (!category) return CATEGORY_TINTS.Other
  return CATEGORY_TINTS[category] || CUSTOM_TINTS[customIndex(category)]
}
