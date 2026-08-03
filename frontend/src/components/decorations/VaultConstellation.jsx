// The Ask My Vault empty state: saved documents wired into one point of AI.
//
// It's the page's claim drawn rather than written — the assistant sits at the
// centre of things you saved, not off to one side of them. Same vocabulary as
// the other flourishes: soft blurred washes, dotted connectors, flat shapes at
// low opacity, no gradients.
//
// Deliberately no `overflow-hidden`: a clipped blur has a hard edge, which is
// exactly what gives cheap decoration away.

// Each node sits at a corner and links back to the centre. Coordinates are
// hand-placed rather than generated — four evenly spaced nodes read as a
// diagram, four slightly irregular ones read as a constellation.
const NODES = [
  { x: 26, y: 20, to: 'M40 40C58 46 74 52 90 57', tone: 'text-primary/45', delay: '0s' },
  { x: 166, y: 16, to: 'M180 36C162 44 146 50 130 55', tone: 'text-secondary/45', delay: '1.4s' },
  { x: 18, y: 86, to: 'M32 104C52 94 72 84 90 74', tone: 'text-warning/40', delay: '2.6s' },
  { x: 172, y: 84, to: 'M186 102C166 92 148 82 130 74', tone: 'text-primary/35', delay: '3.8s' },
]

function DocumentNode({ x, y, tone }) {
  return (
    <g transform={`translate(${x} ${y})`} className={tone}>
      <rect width="28" height="34" rx="5" fill="currentColor" opacity="0.14" />
      <rect width="28" height="34" rx="5" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
      <rect x="6" y="9" width="16" height="2" rx="1" fill="currentColor" opacity="0.55" />
      <rect x="6" y="15" width="12" height="2" rx="1" fill="currentColor" opacity="0.4" />
      <rect x="6" y="21" width="14" height="2" rx="1" fill="currentColor" opacity="0.3" />
    </g>
  )
}

function VaultConstellation() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative select-none">
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-drift rounded-full bg-primary/[0.07] blur-3xl" />
      <div
        className="absolute left-[18%] top-[70%] h-24 w-24 animate-drift rounded-full bg-secondary/[0.06] blur-2xl"
        style={{ animationDelay: '5s' }}
      />
      <div
        className="absolute right-[16%] top-[16%] h-24 w-24 animate-drift rounded-full bg-warning/[0.05] blur-2xl"
        style={{ animationDelay: '9s' }}
      />

      <svg viewBox="0 0 220 130" fill="none" className="relative h-[130px] w-[220px]">
        {NODES.map((node) => (
          <path
            key={node.to}
            d={node.to}
            stroke="currentColor"
            className={node.tone}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeDasharray="2 7"
          />
        ))}

        {NODES.map((node) => (
          <DocumentNode key={`${node.x}-${node.y}`} x={node.x} y={node.y} tone={node.tone} />
        ))}

        {/* The sparkle everything points at. Two smaller ones off-axis stop it
            reading as a logo stamped in the middle. */}
        <g className="text-primary">
          <circle cx="110" cy="64" r="21" fill="currentColor" opacity="0.08" />
          <path
            d="M110 47C112.4 57.6 116.4 61.6 127 64C116.4 66.4 112.4 70.4 110 81C107.6 70.4 103.6 66.4 93 64C103.6 61.6 107.6 57.6 110 47Z"
            fill="currentColor"
            opacity="0.9"
          />
          <path
            d="M132 42C133 46.4 134.6 48 139 49C134.6 50 133 51.6 132 56C131 51.6 129.4 50 125 49C129.4 48 131 46.4 132 42Z"
            fill="currentColor"
            opacity="0.45"
          />
          <path
            d="M88 82C88.8 85.6 90.4 87.2 94 88C90.4 88.8 88.8 90.4 88 94C87.2 90.4 85.6 88.8 82 88C85.6 87.2 87.2 85.6 88 82Z"
            fill="currentColor"
            opacity="0.35"
          />
        </g>
      </svg>
    </div>
  )
}

export default VaultConstellation
