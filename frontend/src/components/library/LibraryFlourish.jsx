// Header decoration: a dashed path that loops and arrows into a tray of
// documents lifting out of it, with a few sparkles.
//
// Same rules as the Dashboard flourish — a page-level layer with no
// `overflow-hidden` (a clipped blur has a hard edge), and both edges anchored
// rather than sized so it can never collide with the header text or buttons.
//
// The height is a clearance budget, not a style choice. This layer sits at
// -z-10, so the opaque search bar paints over it; the art has to finish above
// the search bar's top edge or it reads as sliced off. 80px keeps ~15px of
// daylight below the tray.
//
// `left-[556px]` clears the longest line of subtitle text — the dashed path
// starts at the far left of the viewBox, and a dotted line running underneath
// body copy looks like a rendering fault.
//
// Below ~1400px the remaining gap is too narrow for this to read as anything,
// so it drops out rather than shrinking to a speck.
function LibraryFlourish() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[220px] select-none"
    >
      {/* Soft wash, so the header sits on a floor instead of bare page. */}
      <div className="absolute left-8 top-0 h-52 w-52 animate-drift rounded-full bg-primary/[0.04] blur-3xl" />
      <div
        className="absolute right-[26%] top-2 h-48 w-48 animate-drift rounded-full bg-secondary/[0.035] blur-3xl"
        style={{ animationDelay: '7s' }}
      />
      <div
        className="absolute right-10 top-12 h-44 w-44 animate-drift rounded-full bg-warning/[0.03] blur-3xl"
        style={{ animationDelay: '12s' }}
      />

      <div className="absolute -top-4 left-[556px] right-[352px] hidden h-[80px] opacity-90 min-[1400px]:block">
        <svg viewBox="0 0 420 80" fill="none" className="h-full w-full">
          {/* Dashed path: sweeps in from the left, curls once, then arrows
              toward the tray. The curl is what stops it reading as a stray
              underline. */}
          <path
            d="M6 26C40 22 66 30 86 44C96 30 122 28 128 40C133 50 120 58 112 50C104 42 116 30 132 32C154 35 176 50 202 58C226 65 248 64 264 58"
            stroke="#C7D2FE"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeDasharray="1.5 7"
          />
          <path d="M276 57L263 50L266 57L262 64L276 57Z" fill="#C7D2FE" />

          {/* Sparkles — concave four-point stars, the shape the reference uses. */}
          <path
            d="M40 6Q40 13 47 13Q40 13 40 20Q40 13 33 13Q40 13 40 6Z"
            fill="#FBBF24"
            opacity="0.85"
          />
          <path
            d="M292 20Q292 25 297 25Q292 25 292 30Q292 25 287 25Q292 25 292 20Z"
            fill="#A5B4FC"
          />
          <path
            d="M410 30Q410 36 416 36Q410 36 410 42Q410 36 404 36Q410 36 410 30Z"
            fill="#A5B4FC"
            opacity="0.8"
          />

          {/* Documents lifting out of the tray. Each carries a small mark so it
              reads as a saved item rather than a blank card. */}
          <g transform="rotate(-13 322 30)">
            <rect x="304" y="8" width="36" height="44" rx="7" fill="#D1FAE5" />
            <path
              d="M315 18h14v16l-7-5-7 5V18Z"
              fill="none"
              stroke="#34D399"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <rect x="313" y="40" width="18" height="2.5" rx="1.25" fill="#6EE7B7" />
          </g>

          <g transform="rotate(12 392 28)">
            <rect x="375" y="7" width="34" height="42" rx="7" fill="#E0E2FC" />
            <rect x="383" y="18" width="18" height="2.5" rx="1.25" fill="#A5B4FC" />
            <rect x="383" y="25" width="13" height="2.5" rx="1.25" fill="#A5B4FC" />
            <rect x="383" y="32" width="16" height="2.5" rx="1.25" fill="#C7D2FE" />
          </g>

          <g transform="rotate(4 358 44)">
            <rect x="339" y="22" width="38" height="44" rx="7" fill="#FDECC8" />
            <path
              d="M350 34h16M350 41h11"
              stroke="#F59E0B"
              strokeWidth="2.25"
              strokeLinecap="round"
              opacity="0.75"
            />
            <rect x="350" y="48" width="14" height="2.5" rx="1.25" fill="#FBBF24" opacity="0.7" />
          </g>

          {/* Tray, drawn last so the documents sit behind its front lip. */}
          <path
            d="M304 44H406C409 44 411 46 411 49V73C411 76 409 78 406 78H304C301 78 299 76 299 73V49C299 46 301 44 304 44Z"
            fill="#DFE1FB"
          />
          <path
            d="M299 56H341C344 63 350 66 355 66C360 66 366 63 369 56H411V73C411 76 409 78 406 78H304C301 78 299 76 299 73V56Z"
            fill="#C3C7F5"
          />
        </svg>
      </div>
    </div>
  )
}

export default LibraryFlourish
