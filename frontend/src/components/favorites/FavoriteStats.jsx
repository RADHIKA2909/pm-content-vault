import { useMemo } from 'react'
import { Clock, FolderOpen, Layers, Star } from 'lucide-react'
import MetricCard from '../dashboard/MetricCard.jsx'
import { itemCategories } from '../../lib/categories.js'
import { starredAt } from '../../lib/itemFilters.js'
import { savedAgo } from '../../lib/relativeTime.js'

// What each source type is called when it's the headline number.
const TYPE_LABEL = {
  note: 'Notes',
  pdf: 'PDFs',
  image: 'Images',
  text: 'Pasted notes',
  question: 'Interview questions',
  job: 'Job postings',
  whatsapp_export: 'WhatsApp',
  linkedin_paste: 'LinkedIn posts',
  link: 'Web links',
}

const mostCommon = (values) => {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || null
}

/**
 * Four numbers that answer "what have I actually collected here?".
 *
 * The middle two adapt to the set rather than naming fixed categories. A tile
 * hard-coded to "Frameworks" reads 0 forever for someone who never stars one —
 * a permanent zero isn't a statistic, it's a reproach.
 */
function FavoriteStats({ favorites }) {
  const stats = useMemo(() => {
    const topCategory = mostCommon(favorites.flatMap((item) => itemCategories(item)))
    const topType = mostCommon(
      favorites.map((item) =>
        item.source_type === 'link' && item.link_type === 'linkedin' ? 'linkedin_paste' : item.source_type,
      ),
    )

    const newest = favorites
      .map(starredAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0]

    return { topCategory, topType, newest }
  }, [favorites])

  const { topCategory, topType, newest } = stats

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={Star}
        label="Total favorites"
        value={favorites.length}
        description="Starred for quick access"
        tone="warning"
        delay={0}
      />
      <MetricCard
        icon={FolderOpen}
        label={topCategory ? topCategory[0] : 'Top category'}
        value={topCategory ? topCategory[1] : 0}
        description={topCategory ? 'Your most starred category' : 'Star something to see this'}
        tone="primary"
        delay={60}
      />
      <MetricCard
        icon={Layers}
        label={topType ? TYPE_LABEL[topType[0]] || topType[0] : 'Top type'}
        value={topType ? topType[1] : 0}
        description={topType ? 'Your most starred format' : 'Star something to see this'}
        tone="secondary"
        delay={120}
      />
      {/* A date, not a count. useCountUp passes non-numeric values straight
          through, so this one appears rather than animating from zero. */}
      <MetricCard
        icon={Clock}
        label="Last starred"
        value={newest ? savedAgo(newest) : '—'}
        description={newest ? 'When you last added one' : 'Nothing starred yet'}
        tone="success"
        delay={180}
      />
    </div>
  )
}

export default FavoriteStats
