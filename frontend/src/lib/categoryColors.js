// Deliberately restrained: the 4 core accent colors are reserved for the
// categories that matter most in active prep; News/Other stay neutral so the
// palette doesn't feel noisy across 6 categories.
export const CATEGORY_COLORS = {
  'Interview Questions': 'bg-primary-light text-primary',
  'Job Postings': 'bg-secondary/10 text-secondary',
  'Application Tips': 'bg-warning/10 text-warning',
  Frameworks: 'bg-success/10 text-success',
  'Industry News': 'bg-muted text-text-secondary',
  Other: 'bg-muted text-text-secondary',
}

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
}
