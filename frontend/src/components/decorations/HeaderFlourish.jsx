// Hero decoration: a soft background wash and a paper plane on a dotted arc.
//
// Rendered as a page-level layer behind the content rather than inside the
// header. The header is only ~85px tall, and clipping this to it produced a
// visible rectangular edge on the wash and sliced the plane in half.
//
// Deliberately no `overflow-hidden`: a clipped blur has a hard edge, which is
// exactly what gives cheap decoration away. Every shape is kept well inside
// the layer so nothing needs cutting off, and nothing can push the page wide.
function HeaderFlourish() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[240px] select-none"
    >
      {/* Soft wash — gives the hero a floor to sit on instead of bare page. */}
      <div className="absolute left-4 top-0 h-56 w-56 animate-drift rounded-full bg-primary/[0.05] blur-3xl" />
      <div
        className="absolute right-[22%] top-2 h-52 w-52 animate-drift rounded-full bg-secondary/[0.045] blur-3xl"
        style={{ animationDelay: '6s' }}
      />
      <div
        className="absolute right-8 top-16 h-48 w-48 animate-drift rounded-full bg-warning/[0.04] blur-3xl"
        style={{ animationDelay: '11s' }}
      />

      {/* Plane and trail, sitting in the empty gap between the greeting text and
          the search box so nothing opaque covers them.

          Both edges are anchored, not sized: the search + button block is
          fixed-width and right-aligned, so its left edge is a constant 434px
          from the content edge at every viewport — hence `right-[448px]` for a
          clear 14px. `left-[556px]` clears the longest line of greeting text.
          The band stops short of the metric cards, which begin ~109px down.

          Below ~1400px the remaining gap is too narrow to read as anything, so
          it drops out rather than shrinking to a speck. */}
      <div className="absolute left-[556px] right-[448px] top-0 hidden h-[100px] min-[1400px]:block">
        <svg viewBox="0 0 400 104" fill="none" className="h-full w-full">
          <path
            d="M6 92C64 92 116 76 164 56C212 36 262 18 312 24"
            stroke="currentColor"
            className="text-primary/30"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 8"
          />
          <path
            d="M24 102C74 100 120 89 162 74"
            stroke="currentColor"
            className="text-secondary/20"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray="2 9"
          />
          <g className="text-primary" transform="translate(304 4)">
            <path d="M68 0L21 30L34 38L68 0Z" fill="currentColor" opacity="0.38" />
            <path d="M68 0L34 38L41 56L68 0Z" fill="currentColor" opacity="0.8" />
            <path d="M68 0L0 21L21 30L68 0Z" fill="currentColor" opacity="0.26" />
          </g>
        </svg>
      </div>
    </div>
  )
}

export default HeaderFlourish
