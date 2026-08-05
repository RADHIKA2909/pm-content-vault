import { useState } from 'react'
import { Briefcase, FileText, HelpCircle, Linkedin, NotebookPen } from 'lucide-react'
import { monogramTone } from '../../lib/cardIntel.js'
import WhatsappMark from '../WhatsappMark.jsx'

/**
 * The preview at the top of a Library card.
 *
 * Each kind gets its own treatment, because the point of the grid is that you
 * recognise a PDF from a note from a scraped article without reading a word.
 * There is deliberately no shared "generic" branch that everything falls back
 * to — the fallbacks are per-kind and still look intentional.
 *
 * SourceThumbnail.jsx is left alone: it serves the small 56px contexts (Ask My
 * Vault examples, the item sidebar) where none of this detail would survive.
 */

// A tinted ground with a big letter. Used wherever there's no real artwork —
// never a broken image, and the colour is stable per domain so the grid stays
// scannable by source.
function Monogram({ seed, label, Icon }) {
  const tone = monogramTone(seed)

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center gap-2 ${tone.field}`}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[20px] font-semibold uppercase ${tone.tile}`}>
        {Icon ? <Icon className="h-5 w-5" strokeWidth={1.75} /> : (seed || '?')[0]}
      </span>
      {label && (
        <span className="max-w-[80%] truncate text-[11px] font-medium text-text-secondary">{label}</span>
      )}
    </div>
  )
}

// Real artwork, with a monogram standing in if it fails to load. Images use
// object-contain on a tinted ground: a KPI tree or a funnel diagram cropped
// through the middle is worse than one shown small and whole.
function Artwork({ src, fit, seed, label, Icon, fallback }) {
  const [failed, setFailed] = useState(false)
  // `fallback` lets a caller substitute something better than a monogram — a
  // PDF whose stored page render has gone missing is still best represented by
  // its generated cover, not by the first letter of its title.
  if (!src || failed) return fallback ?? <Monogram seed={seed} label={label} Icon={Icon} />

  return (
    <div className={`h-full w-full ${fit === 'contain' ? 'bg-muted/60 p-2' : ''}`}>
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover object-top'}`}
      />
    </div>
  )
}

// The WhatsApp mark, inlined. lucide carries no WhatsApp glyph, and the
// generic speech bubble it does have was indistinguishable from any other
// chat source — the whole point of this tile is knowing at a glance that the
// item came out of a chat export.
function WhatsappTile() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#25D366]/10">
      {/* The mark alone. The badge in the corner already says "WhatsApp", and
          with it moved to the bottom the two sat stacked forty pixels apart
          saying the same word twice. */}
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]">
        <WhatsappMark />
      </span>
    </div>
  )
}

// The fallback cover, used when a PDF has no rendered page — items saved
// before the preview existed, or one pdf.js couldn't rasterise.
function PdfCover({ title }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden bg-primary p-3.5 pb-9">
      <span aria-hidden="true" className="absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <span aria-hidden="true" className="absolute -bottom-10 -left-4 h-20 w-20 rounded-full bg-white/[0.07]" />
      <FileText className="absolute right-3 top-3 h-4 w-4 text-white/50" strokeWidth={1.75} />

      {/* Title only. The subtitle and page count sit inches below in the card
          body, and a cover that repeats them reads as a rendering bug. */}
      <p className="relative line-clamp-3 text-[15px] font-semibold leading-snug text-white">{title}</p>
    </div>
  )
}

// Notes are stored as sanitised HTML, so stripping tags alone leaves entities
// like &nbsp; sitting in the preview as literal text. Decoding through the
// parser handles every entity rather than a hand-written list of the common
// ones.
function plainText(html) {
  if (!html) return ''
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/\s+/g, ' ').trim()
}

// A page from a notebook: cream ground, ruled lines, the words the user
// actually wrote. Their own writing is the most recognisable thing on the card.
function NoteCover({ text }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-accent-light/70 px-3.5 pb-9 pt-3.5">
      <span aria-hidden="true" className="absolute inset-y-0 left-4 w-px bg-accent/25" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 21px, rgba(249,115,22,0.18) 22px)',
          // Aligned to the first line of text, which starts at the top of
          // the page now that the type badge sits in the bottom-right corner.
          backgroundPosition: '0 18px',
        }}
      />
      <p className="relative ml-3 line-clamp-4 text-[12.5px] italic leading-[22px] text-text-primary/85">
        {text || 'Empty note'}
      </p>
    </div>
  )
}

function CardHero({ item, descriptor }) {
  const { kind, title, subtitle, domain } = descriptor

  if (kind === 'pdf') {
    // Page 1, rasterised in the browser at upload by renderPdfPreview and
    // stored as thumbnail_url. Cropped from the top rather than fitted whole:
    // a portrait page letterboxed into a landscape tile is mostly empty
    // margin, and the top of the page is the part that identifies it.
    return <Artwork src={item.thumbnail_url} seed={title} fallback={<PdfCover title={title} />} />
  }

  if (kind === 'whatsapp') {
    return <WhatsappTile />
  }

  if (kind === 'note') {
    // raw_content is sanitised HTML for notes; the tags come out so the
    // preview is the writing rather than the markup.
    const text = plainText(item.raw_content)
    return <NoteCover text={text || item.summary} />
  }

  if (kind === 'image') {
    return (
      <Artwork
        src={item.thumbnail_url || item.file_url}
        fit="contain"
        seed={title}
      />
    )
  }

  if (kind === 'job') {
    return <Monogram seed={item.company || title} label={item.company} Icon={Briefcase} />
  }

  if (kind === 'question') {
    return <Monogram seed={title} label={item.subcategory} Icon={HelpCircle} />
  }

  if (kind === 'linkedin') {
    return <Artwork src={item.thumbnail_url || item.file_url} seed={item.author || 'LinkedIn'} label={item.author} Icon={Linkedin} />
  }

  // article — the page's own og:image when the fetch found one, otherwise a
  // monogram of the domain it came from. No label on the monogram: for an
  // article the badge *is* the domain, so it would print the same string
  // twice in the same corner of the same tile.
  return <Artwork src={item.thumbnail_url || item.file_url} seed={domain || title} Icon={NotebookPen} />
}

export default CardHero
