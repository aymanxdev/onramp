/**
 * Pip, the Onramp mascot. One component, seven states, driven by the designer's SVG master.
 * Palette: body #b5cd7a, ears and feet #a3bd68, ink line #141413, map #f2c94c, cheeks #d97757.
 * The flat hex values are the mascot's own colours and do not change with theme.
 * Reduced motion is handled in the module CSS (animations off, first frame shown).
 */
import s from './Mascot.module.css'

export type MascotState = 'idle' | 'thinking' | 'found' | 'confused' | 'sleeping' | 'waving' | 'mark'

const BODY = '#b5cd7a'
const EAR = '#a3bd68'
const INK = '#141413'
const MAP = '#f2c94c'
const CHEEK = '#d97757'
const EYE_HL = '#faf9f5'

const LINE = { stroke: INK, strokeWidth: 2.5 } as const

function Ears({ y = 36 }: { y?: number }) {
  return (
    <>
      <ellipse cx="44" cy={y} rx="9" ry="10" fill={EAR} {...LINE} />
      <ellipse cx="86" cy={y} rx="9" ry="10" fill={EAR} {...LINE} />
    </>
  )
}
function Feet() {
  return (
    <>
      <rect x="45" y="96" width="14" height="16" rx="7" fill={EAR} {...LINE} />
      <rect x="71" y="96" width="14" height="16" rx="7" fill={EAR} {...LINE} />
    </>
  )
}
function Body({ dy = 0 }: { dy?: number }) {
  const d =
    dy === 0
      ? 'M31 66 Q31 38 60 38 L70 38 Q99 38 99 66 L101 90 Q101 102 87 102 L43 102 Q29 102 29 90 Z'
      : 'M31 68 Q31 40 60 40 L70 40 Q99 40 99 68 L101 92 Q101 104 87 104 L43 104 Q29 104 29 92 Z'
  return <path d={d} fill={BODY} {...LINE} />
}
function Cheeks({ y = 78, o = 0.5 }: { y?: number; o?: number }) {
  return (
    <>
      <circle cx="41" cy={y} r="5" fill={CHEEK} opacity={o} />
      <circle cx="89" cy={y} r="5" fill={CHEEK} opacity={o} />
    </>
  )
}
function Hand({ x, y, r = 0, className }: { x: number; y: number; r?: number; className?: string }) {
  return (
    <g className={className} style={{ transform: `translate(${x}px,${y}px) rotate(${r}deg)` }}>
      <rect x="-8" y="-9" width="18" height="18" rx="9" fill={BODY} {...LINE} />
    </g>
  )
}
/** Folded map, tucked under one arm. */
function MapTucked({ x, y, r, flip = false, o = 0.5 }: { x: number; y: number; r: number; flip?: boolean; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})${flip ? ' scale(-1,1)' : ''}`}>
      <path d="M0 0 L26 -5 L26 15 L0 20 Z" fill={MAP} {...LINE} strokeLinejoin="round" />
      <path d="M9 -2 L9 18 M17 -3 L17 17" stroke={INK} strokeWidth="1.5" opacity={o} />
    </g>
  )
}
function Shadow({ rx = 30, cy = 116, o = 0.22 }: { rx?: number; cy?: number; o?: number }) {
  return <ellipse cx="65" cy={cy} rx={rx} ry={cy === 118 ? 4 : 5} fill={INK} opacity={o} />
}

const VIEW = '0 0 130 124'

function Idle({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <g className={s.breathe}>
        <Shadow />
        <Ears />
        <Feet />
        <Body />
        <Cheeks />
        <path d="M44 53 Q50 49 56 52" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M74 52 Q80 49 86 53" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="51" cy="66" rx="8" ry="9.5" fill={INK} />
        <ellipse cx="79" cy="66" rx="8" ry="9.5" fill={INK} />
        <circle cx="54" cy="62" r="3" fill={EYE_HL} />
        <circle cx="82" cy="62" r="3" fill={EYE_HL} />
        <path d="M57 82 Q65 88 73 82" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <MapTucked x={102} y={68} r={12} />
        <Hand x={24} y={86} r={-10} />
        <Hand x={94} y={86} r={8} />
      </g>
    </svg>
  )
}

function Thinking({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <g className={s.read}>
        <Shadow />
        <Ears />
        <Feet />
        <Body />
        <Cheeks />
        <path d="M44 51 Q50 54 56 51" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M74 51 Q80 54 86 51" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="51" cy="67" rx="8" ry="9" fill={INK} />
        <ellipse cx="79" cy="67" rx="8" ry="9" fill={INK} />
        <circle cx="52" cy="71" r="2.6" fill={EYE_HL} />
        <circle cx="80" cy="71" r="2.6" fill={EYE_HL} />
        <path d="M60 84 L70 84" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <g className={s.mapJiggle}>
          <path d="M34 78 L96 78 L92 106 L38 106 Z" fill={MAP} {...LINE} strokeLinejoin="round" />
          <path d="M54 78 L52 106 M76 78 L78 106" stroke={INK} strokeWidth="1.5" opacity=".45" />
          <path d="M44 98 Q58 88 66 96 T88 84" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
          <Hand x={24} y={86} />
          <Hand x={96} y={84} />
        </g>
      </g>
    </svg>
  )
}

function Found({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <path d="M12 40 L19 44" stroke={MAP} strokeWidth="3" strokeLinecap="round" className={s.spark1} />
      <path d="M20 22 L26 29" stroke={MAP} strokeWidth="3" strokeLinecap="round" className={s.spark2} />
      <path d="M118 44 L111 47" stroke={MAP} strokeWidth="3" strokeLinecap="round" className={s.spark3} />
      <g className={s.hop}>
        <Shadow rx={26} cy={118} o={0.16} />
        <Ears />
        <Feet />
        <Body />
        <Cheeks o={0.55} />
        <path d="M43 50 Q50 45 57 49" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M73 49 Q80 45 87 50" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="51" cy="65" rx="8.5" ry="10.5" fill={INK} />
        <ellipse cx="79" cy="65" rx="8.5" ry="10.5" fill={INK} />
        <circle cx="54" cy="61" r="3.2" fill={EYE_HL} />
        <circle cx="82" cy="61" r="3.2" fill={EYE_HL} />
        <path d="M56 80 Q65 92 74 80 Z" fill={INK} />
        <g className={s.armUpLeft}>
          <Hand x={22} y={52} />
        </g>
        <g className={s.armUpRight}>
          <g style={{ transform: 'translate(98px,44px) rotate(-14deg)' }}>
            <path d="M0 -10 L26 -16 L26 6 L0 10 Z" fill={MAP} {...LINE} strokeLinejoin="round" />
            <path d="M9 -12 L9 8 M17 -13 L17 7" stroke={INK} strokeWidth="1.5" opacity=".5" />
            <rect x="-9" y="-3" width="18" height="18" rx="9" fill={BODY} {...LINE} />
          </g>
        </g>
      </g>
    </svg>
  )
}

function Confused({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <text x="102" y="30" className={s.question} fill={MAP}>
        ?
      </text>
      <g className={s.tilt}>
        <Shadow />
        <Ears />
        <Feet />
        <Body />
        <Cheeks />
        <path d="M43 47 Q50 43 57 48" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M74 53 Q80 51 86 54" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="51" cy="66" rx="8.5" ry="10" fill={INK} />
        <ellipse cx="79" cy="67" rx="6.5" ry="7" fill={INK} />
        <circle cx="54" cy="62" r="3" fill={EYE_HL} />
        <circle cx="81" cy="64" r="2.3" fill={EYE_HL} />
        <path d="M57 84 Q61 80 65 84 Q69 88 73 84" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <MapTucked x={104} y={92} r={12} flip o={0.45} />
        <Hand x={24} y={88} r={24} />
        <Hand x={92} y={86} r={-6} />
      </g>
    </svg>
  )
}

function Sleeping({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <text x="100" y="36" className={s.z1} fill={BODY}>
        z
      </text>
      <text x="94" y="50" className={s.z2} fill={BODY}>
        z
      </text>
      <g className={s.slump}>
        <Shadow rx={32} />
        <Ears y={38} />
        <Body dy={2} />
        <Cheeks y={80} />
        <path d="M44 55 Q50 52 56 55" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M74 55 Q80 52 86 55" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M43 68 Q51 76 59 68" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M71 68 Q79 76 87 68" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M61 84 Q65 88 69 84" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 92 L104 88 L104 106 Q104 110 98 110 L32 110 Q26 110 26 106 Z" fill={MAP} {...LINE} strokeLinejoin="round" />
        <path d="M52 90 L52 110 M78 89 L78 110" stroke={INK} strokeWidth="1.5" opacity=".45" />
        <Hand x={36} y={86} r={-8} />
        <Hand x={88} y={84} r={8} />
      </g>
    </svg>
  )
}

function Waving({ label }: { label: string }) {
  return (
    <svg viewBox={VIEW} className={s.svg} role="img" aria-label={label}>
      <g className={s.breatheFast}>
        <Shadow />
        <Ears />
        <Feet />
        <Body />
        <Cheeks o={0.55} />
        <path d="M43 49 Q50 45 57 49" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M73 49 Q80 45 87 49" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M43 66 Q51 58 59 66" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M71 66 Q79 58 87 66" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M57 80 Q65 91 73 80 Z" fill={INK} />
        <MapTucked x={102} y={68} r={12} />
        <g className={s.waveFast}>
          <Hand x={27} y={56} />
        </g>
        <Hand x={94} y={86} r={8} />
      </g>
    </svg>
  )
}

/** Face only, no prop: the app icon and the logo lockup. Two ear bumps keep it off a circle. */
function Mark({ label }: { label: string }) {
  return (
    <svg viewBox="28 24 74 82" className={s.svg} role="img" aria-label={label}>
      <Ears />
      <Body />
      <ellipse cx="51" cy="66" rx="8" ry="9.5" fill={INK} />
      <ellipse cx="79" cy="66" rx="8" ry="9.5" fill={INK} />
      <circle cx="54" cy="62" r="3" fill={EYE_HL} />
      <circle cx="82" cy="62" r="3" fill={EYE_HL} />
      <path d="M57 82 Q65 88 73 82" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const LABELS: Record<MascotState, string> = {
  idle: 'Pip idle',
  thinking: 'Pip reading the map',
  found: 'Pip found it',
  confused: 'Pip confused',
  sleeping: 'Pip sleeping',
  waving: 'Pip waving',
  mark: 'Onramp mark',
}

export type MascotProps = {
  state?: MascotState
  /** CSS size of the box; the SVG fills it. */
  size?: number | string
  className?: string
  /** Override the accessible label. Pass "" with decorative to hide from AT. */
  label?: string
  decorative?: boolean
}

export function Mascot({ state = 'idle', size, className, label, decorative }: MascotProps) {
  const l = label ?? LABELS[state]
  const View = { idle: Idle, thinking: Thinking, found: Found, confused: Confused, sleeping: Sleeping, waving: Waving, mark: Mark }[state]
  return (
    <span
      className={className}
      style={{ display: 'block', width: size ?? '100%', flex: 'none' }}
      aria-hidden={decorative ? true : undefined}
    >
      <View label={l} />
    </span>
  )
}
