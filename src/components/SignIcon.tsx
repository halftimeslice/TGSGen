// Sign library — all NSW/AS 1742 TTM signs as inline SVG
// Codes match TCAW v6.1; shapes/colours per AS 1743:2023 and AS 1443
// Each sign renders at a normalised 100×100 (or 80×100 for rectangulars) viewBox.

const Y = '#FFE800'   // fluorescent yellow-green (AS 1443 safety yellow)
const BK = '#1a1a1a'  // black
const WH = '#FFFFFF'  // white
const RD = '#CC0000'  // regulation red
const AM = '#FFA500'  // amber (TTL / arrow boards)

type SVGProps = { px?: number; className?: string }

// ── Shared primitives ────────────────────────────────────────────────────────

// Standard diamond outline: top(50,6) right(94,50) bottom(50,94) left(6,50)
function Diamond({ children }: { children: React.ReactNode }) {
  return (
    <>
      <polygon points="50,4 96,50 50,96 4,50" fill={Y} stroke={BK} strokeWidth="4" />
      {children}
    </>
  )
}

// T-series text label inside diamond (short strings)
function DiamondText({ lines }: { lines: string[] }) {
  const y0 = 50 - (lines.length - 1) * 8
  return (
    <text fontFamily="Arial Black, Arial" fontWeight="900" fontSize="11" fill={BK} textAnchor="middle">
      {lines.map((l, i) => <tspan key={i} x="50" y={y0 + i * 15}>{l}</tspan>)}
    </text>
  )
}

// Generic worker silhouette (simplified) for T1-5, T1-34
function WorkerFigure({ x = 50, y = 38, armUp = false }) {
  return (
    <g fill={BK}>
      {/* head */}
      <circle cx={x} cy={y - 10} r="6" />
      {/* body */}
      <line x1={x} y1={y - 4} x2={x} y2={y + 14} stroke={BK} strokeWidth="3.5" />
      {/* legs */}
      <line x1={x} y1={y + 14} x2={x - 7} y2={y + 26} stroke={BK} strokeWidth="3" />
      <line x1={x} y1={y + 14} x2={x + 7} y2={y + 26} stroke={BK} strokeWidth="3" />
      {/* arms */}
      {armUp
        ? <>
            <line x1={x} y1={y + 2} x2={x - 10} y2={y - 6} stroke={BK} strokeWidth="3" />
            <line x1={x} y1={y + 2} x2={x + 10} y2={y - 8} stroke={BK} strokeWidth="3" />
          </>
        : <>
            <line x1={x} y1={y + 2} x2={x - 10} y2={y + 10} stroke={BK} strokeWidth="3" />
            <line x1={x} y1={y + 2} x2={x + 10} y2={y + 10} stroke={BK} strokeWidth="3" />
          </>
      }
    </g>
  )
}

// Shovel symbol for T1-1
function ShovelSymbol() {
  return (
    <g fill={BK} stroke={BK} strokeLinejoin="round">
      {/* handle */}
      <line x1="55" y1="22" x2="42" y2="62" strokeWidth="3.5" />
      {/* blade */}
      <path d="M38,60 L34,76 Q34,82 40,82 L48,82 Q54,82 54,76 L50,60 Z" />
      {/* ground mound */}
      <path d="M26,78 Q36,68 50,68 Q64,68 74,78" fill="none" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

// ── T1 Series — Warning/Hazard signs (yellow diamond, black symbol) ──────────

export function T1_1({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond><ShovelSymbol /></Diamond>
    </svg>
  )
}

export function T1_3({ px = 60, speed = 40 }: SVGProps & { speed?: number }) {
  return (
    <svg viewBox="0 0 80 96" width={px * 0.85} height={px}>
      <rect x="4" y="4" width="72" height="88" rx="4" fill={WH} stroke={RD} strokeWidth="7" />
      <text x="40" y="54" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="34"
        fill={BK} textAnchor="middle">{speed}</text>
      <text x="40" y="76" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12"
        fill={BK} textAnchor="middle">KM/H</text>
    </svg>
  )
}

export function T1_5({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond><WorkerFigure y={42} /></Diamond>
    </svg>
  )
}

export function T1_9({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond><DiamondText lines={['WORK', 'ZONE']} /></Diamond>
    </svg>
  )
}

export function T1_10({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond><DiamondText lines={['END', 'ROAD', 'WORK']} /></Diamond>
    </svg>
  )
}

export function T1_10_1n({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* Exclamation mark */}
        <rect x="46" y="26" width="8" height="28" rx="3" fill={BK} />
        <circle cx="50" cy="68" r="5" fill={BK} />
      </Diamond>
    </svg>
  )
}

export function T1_16({ px = 60, distanceKm = 5 }: SVGProps & { distanceKm?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['ROAD', 'WORK', `${distanceKm}KM`]} />
      </Diamond>
    </svg>
  )
}

export function T1_25({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['ROAD', 'WORK', 'SIDE RD']} />
      </Diamond>
    </svg>
  )
}

export function T1_34({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond><WorkerFigure y={42} armUp /></Diamond>
    </svg>
  )
}

export function T1_4({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['PREPARE', 'TO STOP']} />
      </Diamond>
    </svg>
  )
}

// T1-6: Two lanes converging to one — standard AS 1742 lane-narrowing pictogram
export function T1_6({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <g stroke={BK} strokeWidth="4" strokeLinecap="round" fill="none">
          <line x1="36" y1="24" x2="50" y2="63" />
          <line x1="64" y1="24" x2="50" y2="63" />
          <line x1="50" y1="63" x2="50" y2="73" />
        </g>
        <polygon points="44,70 50,80 56,70" fill={BK} />
      </Diamond>
    </svg>
  )
}

// ── T2 Series — Motorcycle/Cycle hazards ────────────────────────────────────

export function T2_207n({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* simplified motorcycle outline */}
        <g fill="none" stroke={BK} strokeWidth="2.5" strokeLinecap="round">
          <circle cx="34" cy="62" r="10" />
          <circle cx="66" cy="62" r="10" />
          <path d="M34,52 L44,42 L56,42 L64,52" />
          <line x1="50" y1="42" x2="50" y2="36" />
          <line x1="44" y1="36" x2="56" y2="36" />
          {/* grooved lines */}
          <line x1="28" y1="70" x2="72" y2="70" strokeDasharray="3,3" />
        </g>
      </Diamond>
    </svg>
  )
}

// T2-6: Road Closed — orange rectangular sign per TCAW v6.1
export function T2_6({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 120 80" width={px * 1.5} height={px}>
      <rect x="4" y="4" width="112" height="72" rx="5" fill="#FF7D00" stroke={BK} strokeWidth="6" />
      <text fontFamily="Arial Black, Arial" fontWeight="900" fontSize="26" fill={BK} textAnchor="middle">
        <tspan x="60" y="37">ROAD</tspan>
        <tspan x="60" y="63">CLOSED</tspan>
      </text>
    </svg>
  )
}

// ── T3 Series — Surface condition warnings ───────────────────────────────────

function SurfaceSign({ symbol }: { symbol: React.ReactNode }) {
  return <Diamond>{symbol}</Diamond>
}

export function T3_1({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <SurfaceSign symbol={<DiamondText lines={['WET', 'TAR']} />} />
    </svg>
  )
}

export function T3_3({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* car with skid marks */}
        <g fill={BK}>
          <rect x="34" y="36" width="32" height="18" rx="4" />
          <rect x="38" y="28" width="22" height="12" rx="3" />
          <circle cx="40" cy="56" r="5" />
          <circle cx="60" cy="56" r="5" />
          <path d="M32,66 Q40,60 48,66 Q56,60 64,66 Q72,60 80,66" fill="none" stroke={BK} strokeWidth="2.5" />
        </g>
      </Diamond>
    </svg>
  )
}

export function T3_6({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <SurfaceSign symbol={<DiamondText lines={['SOFT', 'EDGES']} />} />
    </svg>
  )
}

export function T3_9({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['LOOSE', 'GRAVEL']} />
      </Diamond>
    </svg>
  )
}

export function T3_13({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['GRAVEL', 'ROAD']} />
      </Diamond>
    </svg>
  )
}

export function T3_14({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['LOOSE', 'SURFACE']} />
      </Diamond>
    </svg>
  )
}

export function T3_37({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* bumpy road profile */}
        <path d="M22,58 Q30,42 38,58 Q46,42 54,58 Q62,42 70,58 Q78,42 86,58"
          fill="none" stroke={BK} strokeWidth="4" strokeLinecap="round" />
        {/* road line */}
        <line x1="22" y1="68" x2="78" y2="68" stroke={BK} strokeWidth="3" />
      </Diamond>
    </svg>
  )
}

// ── T5 Series — Delineation, markers, control devices ───────────────────────

export function T5_2_stop({ px = 48 }: SVGProps) {
  return (
    <svg viewBox="0 0 60 90" width={px * 0.67} height={px}>
      {/* pole */}
      <rect x="27" y="54" width="6" height="36" fill={BK} />
      {/* octagon approximation */}
      <polygon points="30,4 50,10 56,30 50,50 30,56 10,50 4,30 10,10"
        fill={RD} stroke={WH} strokeWidth="3" />
      <text x="30" y="35" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="12"
        fill={WH} textAnchor="middle">STOP</text>
    </svg>
  )
}

export function T5_2_slow({ px = 48 }: SVGProps) {
  return (
    <svg viewBox="0 0 60 90" width={px * 0.67} height={px}>
      <rect x="27" y="54" width="6" height="36" fill={BK} />
      {/* SLOW face is a circle (not octagonal) per AS 1742.3 */}
      <circle cx="30" cy="28" r="24" fill={Y} stroke={BK} strokeWidth="3" />
      <text x="30" y="33" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="12"
        fill={BK} textAnchor="middle">SLOW</text>
    </svg>
  )
}

// Chevron marker — V-pointing in traffic direction
function ChevronSign({ direction }: { direction: 'left' | 'right' }) {
  // T5-4: pointing toward closed side (left or right of travel)
  const pts = direction === 'right'
    ? '14,14 58,50 14,86 26,86 70,50 26,14'   // right-pointing chevron
    : '86,14 42,50 86,86 74,86 30,50 74,14'   // left-pointing chevron
  return (
    <>
      <rect width="100" height="100" fill={Y} />
      <polygon points={pts} fill={WH} stroke={BK} strokeWidth="2" />
      <rect x="0" y="0" width="100" height="100" fill="none" stroke={BK} strokeWidth="3" />
    </>
  )
}

export function T5_4_left({ px = 50 }: SVGProps) {
  return <svg viewBox="0 0 100 100" width={px * 0.67} height={px}><ChevronSign direction="left" /></svg>
}

export function T5_4_right({ px = 50 }: SVGProps) {
  return <svg viewBox="0 0 100 100" width={px * 0.67} height={px}><ChevronSign direction="right" /></svg>
}

// T5-5: single (lighter) chevron
function SingleChevronSign({ direction }: { direction: 'left' | 'right' }) {
  const pts = direction === 'right'
    ? '24,20 62,50 24,80 36,80 74,50 36,20'
    : '76,20 38,50 76,80 64,80 26,50 64,20'
  return (
    <>
      <rect width="100" height="100" fill={Y} />
      <polygon points={pts} fill={WH} stroke={BK} strokeWidth="2" />
      <rect x="0" y="0" width="100" height="100" fill="none" stroke={BK} strokeWidth="3" />
    </>
  )
}

export function T5_5_left({ px = 50 }: SVGProps) {
  return <svg viewBox="0 0 100 100" width={px * 0.67} height={px}><SingleChevronSign direction="left" /></svg>
}

export function T5_5_right({ px = 50 }: SVGProps) {
  return <svg viewBox="0 0 100 100" width={px * 0.67} height={px}><SingleChevronSign direction="right" /></svg>
}

// T5-15: LED flashing arrow board
function ArrowBoard({ direction }: { direction: 'left' | 'right' | 'down' }) {
  const arrowPath: Record<string, string> = {
    left:  'M80,50 L40,50 M40,50 L56,36 M40,50 L56,64',
    right: 'M20,50 L60,50 M60,50 L44,36 M60,50 L44,64',
    down:  'M50,20 L50,70 M50,70 L34,54 M50,70 L66,54',
  }
  return (
    <>
      <rect width="100" height="60" rx="4" fill="#1a1200" />
      {/* LED dot grid background suggestion */}
      {[16,26,36,46,56,66,76,86].map(cx =>
        [10,20,30,40,50].map(cy =>
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill="#332800" />
        )
      )}
      {/* arrow in amber */}
      <path d={arrowPath[direction]} stroke={AM} strokeWidth="7" strokeLinecap="round" fill="none" />
      <rect width="100" height="60" rx="4" fill="none" stroke="#555" strokeWidth="2" />
    </>
  )
}

export function T5_15_left({ px = 80 }: SVGProps) {
  return <svg viewBox="0 0 100 60" width={px} height={px * 0.6}><ArrowBoard direction="left" /></svg>
}

export function T5_15_right({ px = 80 }: SVGProps) {
  return <svg viewBox="0 0 100 60" width={px} height={px * 0.6}><ArrowBoard direction="right" /></svg>
}

export function T5_15_down({ px = 80 }: SVGProps) {
  return <svg viewBox="0 0 100 60" width={px} height={px * 0.6}><ArrowBoard direction="down" /></svg>
}

export function T5_16({ px = 80, message = 'ROAD WORK\nAHEAD' }: SVGProps & { message?: string }) {
  const lines = message.split('\n')
  return (
    <svg viewBox="0 0 120 70" width={px} height={px * 0.58}>
      <rect width="120" height="70" rx="4" fill="#111" />
      <text fontFamily="'Courier New', monospace" fontWeight="700" fontSize="14" fill={AM} textAnchor="middle">
        {lines.map((l, i) => <tspan key={i} x="60" y={22 + i * 18}>{l}</tspan>)}
      </text>
      <rect width="120" height="70" rx="4" fill="none" stroke="#444" strokeWidth="2" />
    </svg>
  )
}

export function T5_210n({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        <DiamondText lines={['RUMBLE', 'STRIP']} />
      </Diamond>
    </svg>
  )
}

export function T5_272n({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* boom barrier: horizontal bar + stripes */}
        <rect x="20" y="46" width="60" height="8" rx="2" fill={BK} />
        <rect x="20" y="46" width="10" height="8" fill={RD} />
        <rect x="40" y="46" width="10" height="8" fill={RD} />
        <rect x="60" y="46" width="10" height="8" fill={RD} />
        {/* post */}
        <rect x="17" y="42" width="6" height="16" rx="1" fill={BK} />
      </Diamond>
    </svg>
  )
}

// ── T6 Series — Pedestrian ───────────────────────────────────────────────────

export function T6_4({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* walking person */}
        <g fill={BK}>
          <circle cx="50" cy="30" r="6" />
          <line x1="50" y1="36" x2="50" y2="54" stroke={BK} strokeWidth="3.5" />
          <line x1="50" y1="42" x2="42" y2="50" stroke={BK} strokeWidth="3" />
          <line x1="50" y1="42" x2="58" y2="50" stroke={BK} strokeWidth="3" />
          <line x1="50" y1="54" x2="44" y2="66" stroke={BK} strokeWidth="3" />
          <line x1="50" y1="54" x2="56" y2="66" stroke={BK} strokeWidth="3" />
        </g>
      </Diamond>
    </svg>
  )
}

// ── Regulatory Signs ─────────────────────────────────────────────────────────

export function R2_1({ px = 60, speed = 50 }: SVGProps & { speed?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <circle cx="50" cy="50" r="46" fill={WH} stroke={RD} strokeWidth="8" />
      <text x="50" y="62" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="34"
        fill={BK} textAnchor="middle">{speed}</text>
    </svg>
  )
}

export function R2_17({ px = 60 }: SVGProps) {
  return (
    <svg viewBox="0 0 100 100" width={px} height={px}>
      <Diamond>
        {/* traffic light stack */}
        <rect x="40" y="24" width="20" height="52" rx="4" fill={BK} />
        <circle cx="50" cy="34" r="6" fill={RD} />
        <circle cx="50" cy="50" r="6" fill={AM} />
        <circle cx="50" cy="66" r="6" fill="#00CC00" />
      </Diamond>
    </svg>
  )
}

// ── Master dispatch component ─────────────────────────────────────────────────

const CODE_MAP: Record<string, (props: SVGProps & Record<string, unknown>) => React.ReactElement | null> = {
  'T1-1':     (p) => <T1_1 {...p} />,
  'T1-3':     (p) => <T1_3 {...p} />,
  'T1-4':     (p) => <T1_4 {...p} />,
  'T1-5':     (p) => <T1_5 {...p} />,
  'T1-6':     (p) => <T1_6 {...p} />,
  'T1-9':     (p) => <T1_9 {...p} />,
  'T1-10':    (p) => <T1_10 {...p} />,
  'T1-10-1n': (p) => <T1_10_1n {...p} />,
  'T1-16':    (p) => <T1_16 {...p} />,
  'T1-25':    (p) => <T1_25 {...p} />,
  'T1-34':    (p) => <T1_34 {...p} />,
  'T2-6':     (p) => <T2_6 {...p} />,
  'T2-207n':  (p) => <T2_207n {...p} />,
  'T3-1':     (p) => <T3_1 {...p} />,
  'T3-3':     (p) => <T3_3 {...p} />,
  'T3-6':     (p) => <T3_6 {...p} />,
  'T3-9':     (p) => <T3_9 {...p} />,
  'T3-13':    (p) => <T3_13 {...p} />,
  'T3-14':    (p) => <T3_14 {...p} />,
  'T3-37':    (p) => <T3_37 {...p} />,
  'T5-2':      (p) => <T5_2_stop {...p} />,
  'T5-2-stop': (p) => <T5_2_stop {...p} />,
  'T5-2-slow': (p) => <T5_2_slow {...p} />,
  'T5-4-left':  (p) => <T5_4_left {...p} />,
  'T5-4-right': (p) => <T5_4_right {...p} />,
  'T5-5-left':  (p) => <T5_5_left {...p} />,
  'T5-5-right': (p) => <T5_5_right {...p} />,
  'T5-15-left':  (p) => <T5_15_left {...p} />,
  'T5-15-right': (p) => <T5_15_right {...p} />,
  'T5-15-down':  (p) => <T5_15_down {...p} />,
  'T5-16':    (p) => <T5_16 {...p} />,
  'T5-210n':  (p) => <T5_210n {...p} />,
  'T5-272n':  (p) => <T5_272n {...p} />,
  'T6-4':     (p) => <T6_4 {...p} />,
  'R2-1':     (p) => <R2_1 {...p} />,
  'R2-17':    (p) => <R2_17 {...p} />,
}

type SignIconProps = SVGProps & {
  code: string
  speed?: number
  distanceKm?: number
  message?: string
}

export function SignIcon({ code, px = 48, speed, distanceKm, message, className }: SignIconProps) {
  const renderer = CODE_MAP[code]
  if (!renderer) {
    return (
      <svg viewBox="0 0 100 100" width={px} height={px} className={className}>
        <Diamond><DiamondText lines={[code]} /></Diamond>
      </svg>
    )
  }
  const extra: Record<string, unknown> = { className }
  if (speed !== undefined)      extra.speed = speed
  if (distanceKm !== undefined) extra.distanceKm = distanceKm
  if (message !== undefined)    extra.message = message
  return renderer({ px, ...extra })
}
