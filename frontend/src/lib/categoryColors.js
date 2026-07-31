export const CATEGORY_COLORS = {
  'Interview Questions': 'bg-indigo-50 text-indigo-700',
  'Job Postings': 'bg-emerald-50 text-emerald-700',
  'Application Tips': 'bg-amber-50 text-amber-700',
  Frameworks: 'bg-sky-50 text-sky-700',
  'Industry News': 'bg-rose-50 text-rose-700',
  Other: 'bg-slate-100 text-slate-600',
}

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
}
