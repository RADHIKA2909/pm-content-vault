import { useState } from 'react'
import { Briefcase, FileText, HelpCircle, Linkedin, NotebookPen, Type } from 'lucide-react'
import { monogramTone } from '../../lib/cardIntel.js'

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
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.945c0 2.096.549 4.142 1.593 5.945L0 24l6.305-1.654a11.9 11.9 0 0 0 5.683 1.448h.005c6.585 0 11.946-5.359 11.949-11.945A11.9 11.9 0 0 0 20.52 3.45" />
        </svg>
      </span>
      <span className="text-[11px] font-medium text-text-secondary">WhatsApp</span>
    </div>
  )
}

// The fallback cover, used when a PDF has no rendered page — items saved
// before the preview existed, or one pdf.js couldn't rasterise.
function PdfCover({ title }) {
  return (
    <div className="relative flex h-full w-full flex-col justify-end overflow-hidden bg-primary p-3.5">
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
    <div className="relative h-full w-full overflow-hidden bg-accent-light/70 px-3.5 pb-3 pt-9">
      <span aria-hidden="true" className="absolute inset-y-0 left-4 w-px bg-accent/25" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 21px, rgba(249,115,22,0.18) 22px)',
          // Aligned to the first line of text, which now starts below the
          // type badge pinned to the hero's top-left corner.
          backgroundPosition: '0 40px',
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

  if (kind === 'text') {
    return <Monogram seed={title} Icon={Type} />
  }

  // article — the page's own og:image when the fetch found one, otherwise a
  // monogram of the domain it came from.
  return <Artwork src={item.thumbnail_url || item.file_url} seed={domain || title} label={domain} Icon={NotebookPen} />
}

export default CardHero
