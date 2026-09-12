import { useState } from 'react'
import tokensJson from '@/design-system/tokens.json'
import type { SurfaceId, Tint } from '@/features/catalogue/types'
import {
  Button,
  Chip,
  SegmentedControl,
  Textarea,
  ChecklistItem,
  SurfaceBadge,
  Toast,
  Tooltip,
  NodePill,
  Icon,
  Mascot,
  Glow,
  motionSpec,
} from '@/design-system'
import type { IconName } from '@/design-system'
import s from './DesignSystemPage.module.css'

function hex(value: string): string {
  return value.replace('#', '')
}

/** Percentage form of a letter-spacing token like "-0.03em" -> "-3%". */
function trackingPct(tracking: string): string {
  return `${Math.round(parseFloat(tracking) * 100)}%`
}

type SwatchRowProps = { name: string; a: string; b: string; note: string; aOpacity?: number; bOpacity?: number }

function SwatchRow({ name, a, b, note, aOpacity, bOpacity }: SwatchRowProps) {
  return (
    <div className={s.swatchRow}>
      <span className={s.swatch} style={{ background: a, opacity: aOpacity }} />
      <span className={s.swatch} style={{ background: b, opacity: bOpacity }} />
      <code className={s.swatchName}>{name}</code>
      <span className={s.swatchNote}>{note}</span>
    </div>
  )
}

const MASCOT_STATES = [
  { state: 'idle', label: 'IDLE', caption: 'soft smile, map tucked in' },
  { state: 'thinking', label: 'THINKING', caption: 'eyes drop to the map' },
  { state: 'found', label: 'FOUND IT', caption: 'map held overhead, hop' },
  { state: 'confused', label: 'CONFUSED', caption: 'no match state' },
  { state: 'sleeping', label: 'SLEEPING', caption: 'rate limited' },
  { state: 'waving', label: 'WAVING', caption: '404 and footer' },
] as const

const BADGE_SURFACES: Array<{ surface: SurfaceId; tint: Tint }> = [
  { surface: 'chat', tint: 'chat' },
  { surface: 'cowork', tint: 'cowork' },
  { surface: 'code', tint: 'code' },
  { surface: 'design', tint: 'design' },
  { surface: 'chrome', tint: 'cowork' },
  { surface: 'excel', tint: 'code' },
  { surface: 'powerpoint', tint: 'chat' },
  { surface: 'slack', tint: 'design' },
]

const SPACE_KEYS: Array<keyof typeof tokensJson.space> = ['1', '2', '3', '4', '6', '8', '12']

const TOKENS_SUBSET = {
  color: {
    'bg-page': tokensJson.color['bg-page'],
    'bg-surface': tokensJson.color['bg-surface'],
    'text-primary': tokensJson.color['text-primary'],
    'accent-action': tokensJson.color['accent-action'],
    'accent-action-edge': tokensJson.color['accent-action-edge'],
    'accent-attention': tokensJson.color['accent-attention'],
    'accent-detail': tokensJson.color['accent-detail'],
  },
  radius: tokensJson.radius,
  space: { 1: tokensJson.space['1'], 2: tokensJson.space['2'], 3: tokensJson.space['3'], 4: tokensJson.space['4'], 6: tokensJson.space['6'], 8: tokensJson.space['8'] },
  motion: tokensJson.motion.spring,
}

export function DesignSystemPage() {
  const [segValue, setSegValue] = useState<'type' | 'guide'>('type')
  const [chipSelected, setChipSelected] = useState(true)
  const [checklistA, setChecklistA] = useState(false)
  const [checklistB, setChecklistB] = useState(true)

  return (
    <div className={s.page}>
      {/* 03 FOUNDATIONS */}
      <section className={s.section}>
        <span className={s.eyebrow}>03 &nbsp;FOUNDATIONS</span>
        <h2 className={s.h2}>Tokens, named for import</h2>
        <p className={s.intro}>
          Two columns per row: dark value, then light value. Semantic names only, so a surface can retint without a rename.
          Lime is action, sun is attention, terracotta is a detail and appears at most once per screen.
        </p>

        <div className={s.row}>
          <div className={s.panel}>
            <h3 className={s.h3}>Surfaces and ink</h3>
            <SwatchRow name="bg-page" a={tokensJson.color['bg-page'].dark} b={tokensJson.color['bg-page'].light} note={`${hex(tokensJson.color['bg-page'].dark)} / ${hex(tokensJson.color['bg-page'].light)}`} />
            <SwatchRow name="bg-surface" a={tokensJson.color['bg-surface'].dark} b={tokensJson.color['bg-surface'].light} note={`${hex(tokensJson.color['bg-surface'].dark)} / ${hex(tokensJson.color['bg-surface'].light)}`} />
            <SwatchRow name="bg-subtle" a={tokensJson.color['bg-subtle'].dark} b={tokensJson.color['bg-subtle'].light} note={`${hex(tokensJson.color['bg-subtle'].dark)} / ${hex(tokensJson.color['bg-subtle'].light)}`} />
            <SwatchRow name="border" a={tokensJson.color['border'].dark} b={tokensJson.color['border'].light} note={`${hex(tokensJson.color['border'].dark)} / ${hex(tokensJson.color['border'].light)}`} />
            <SwatchRow name="text-primary" a={tokensJson.color['text-primary'].dark} b={tokensJson.color['text-primary'].light} note="15.8:1 / 15.8:1" />
            <SwatchRow name="text-secondary" a={tokensJson.color['text-secondary'].dark} b={tokensJson.color['text-secondary'].light} note="8.4:1 / 6.9:1" />
            <SwatchRow name="text-muted" a={tokensJson.color['text-muted'].dark} b={tokensJson.color['text-muted'].light} note="5.4:1 / 5.2:1" />
          </div>

          <div className={s.panel}>
            <h3 className={s.h3}>Accents, tints and states</h3>
            <SwatchRow name="accent-action" a={tokensJson.color['accent-action']} b={tokensJson.color['accent-action-edge']} note={`${hex(tokensJson.color['accent-action'])} / edge ${hex(tokensJson.color['accent-action-edge'])}`} />
            <SwatchRow name="accent-attention" a={tokensJson.color['accent-attention']} b={tokensJson.color['accent-attention-edge']} note={`${hex(tokensJson.color['accent-attention'])} / edge ${hex(tokensJson.color['accent-attention-edge'])}`} />
            <SwatchRow name="accent-detail" a={tokensJson.color['accent-detail']} b={tokensJson.color['accent-detail']} bOpacity={0.45} note={`${hex(tokensJson.color['accent-detail'])} · once per screen`} />
            <SwatchRow name="tint-chat / cowork" a={tokensJson.color['tint-chat']} b={tokensJson.color['tint-cowork']} note={`${hex(tokensJson.color['tint-chat'])} / ${hex(tokensJson.color['tint-cowork'])}`} />
            <SwatchRow name="tint-code / design" a={tokensJson.color['tint-code']} b={tokensJson.color['tint-design']} note={`${hex(tokensJson.color['tint-code'])} / ${hex(tokensJson.color['tint-design'])}`} />
            <SwatchRow name="state-ok" a={tokensJson.color['state-ok'].dark} b={tokensJson.color['state-ok'].light} note={`${hex(tokensJson.color['state-ok'].dark)} / ${hex(tokensJson.color['state-ok'].light)}`} />
            <SwatchRow name="state-warn" a={tokensJson.color['state-warn'].dark} b={tokensJson.color['state-warn'].light} note={`${hex(tokensJson.color['state-warn'].dark)} / ${hex(tokensJson.color['state-warn'].light)}`} />
          </div>
        </div>

        <div className={[s.row, s.rowTop].join(' ')}>
          <div className={s.panel} style={{ flexBasis: '380px' }}>
            <h3 className={[s.h3, s.h3Gap].join(' ')}>Type scale, fluid</h3>
            <p className={s.typeDisplay}>Display</p>
            <p className={s.typeCaption}>
              display &middot; {tokensJson.type.display.size} / {tokensJson.type.display.line} / {trackingPct(tokensJson.type.display.tracking)}
            </p>
            <p className={s.typeH2Sample}>Section heading</p>
            <p className={s.typeCaption}>
              h2 &middot; {tokensJson.type.h2.size} / {tokensJson.type.h2.line} / {trackingPct(tokensJson.type.h2.tracking)}
            </p>
            <p className={s.typeH3Sample}>Card heading</p>
            <p className={s.typeCaption}>
              h3 &middot; {tokensJson.type.h3.size} / {tokensJson.type.h3.line}
            </p>
            <p className={s.typeBody}>
              Body copy sits at 17px on mobile and 18px on desktop, with a 1.6 line height and a measure that never runs
              past 66 characters. Numbers in a paragraph, like 200 connectors, stay in the sans.
            </p>
            <p className={s.typeCaption}>body &middot; 17 to 18px / 1.6 / max 66ch</p>
            <p className={s.typeMonoLabel}>MONO LABEL &middot; VALUES ONLY</p>
            <p className={s.typeCaption}>mono-label &middot; 10 to 11px / .16em &middot; prompts, dates, hex, step numbers</p>
          </div>

          <div className={s.panelColumn}>
            <div className={s.panel}>
              <h3 className={[s.h3, s.h3Gap].join(' ')}>Space, 4px base</h3>
              <div className={s.spaceRow}>
                {SPACE_KEYS.map((key) => {
                  const px = tokensJson.space[key]
                  return <span key={key} style={{ width: px, height: px, background: 'var(--accent-action)', borderRadius: Math.max(2, Math.round(px / 6)) }} />
                })}
              </div>
              <p className={s.spaceCaption}>1 &middot; 2 &middot; 3 &middot; 4 &middot; 6 &middot; 8 &middot; 12 &nbsp;&rarr;&nbsp; 4 to 48px</p>
            </div>
            <div className={s.panel}>
              <h3 className={[s.h3, s.h3Gap].join(' ')}>Radius and shadow</h3>
              <div className={s.swatchesWrap}>
                <span className={s.radiusBox} style={{ borderRadius: tokensJson.radius.sm }}>
                  {tokensJson.radius.sm}
                </span>
                <span className={s.radiusBox} style={{ borderRadius: tokensJson.radius.md }}>
                  {tokensJson.radius.md}
                </span>
                <span className={s.radiusBox} style={{ borderRadius: tokensJson.radius.lg }}>
                  {tokensJson.radius.lg}
                </span>
                <span className={s.radiusBox} style={{ borderRadius: tokensJson.radius.pill }}>
                  pill
                </span>
              </div>
              <div className={[s.swatchesWrap, s.rowTop].join(' ')}>
                <span className={s.shadowBox} style={{ boxShadow: '0 3px 0 var(--border-strong)' }}>
                  edge-3
                </span>
                <span className={s.shadowBox} style={{ boxShadow: 'var(--shadow-pop)' }}>
                  pop
                </span>
                <span className={s.shadowBox} style={{ boxShadow: 'var(--shadow-card)' }}>
                  card
                </span>
              </div>
            </div>
          </div>

          <div className={[s.panel, s.panelSubtle].join(' ')}>
            <div className={s.exportHead}>
              <h3 className={s.h3} style={{ margin: 0 }}>
                tokens.json
              </h3>
              <span className={s.exportTag}>EXPORT</span>
            </div>
            <pre className={s.pre}>{JSON.stringify(TOKENS_SUBSET, null, 2)}</pre>
          </div>
        </div>
      </section>

      {/* 04 COMPONENTS */}
      <section className={s.section}>
        <span className={s.eyebrow}>04 &nbsp;COMPONENTS</span>
        <h2 className={s.h2}>Every state, one press away</h2>
        <p className={s.intro}>
          Chunky pills with a solid bottom edge that compresses on press. Hover lifts 2px, active drops 4px and drops the
          edge, focus-visible draws a 3px ring at 3px offset. Tab through this section to see it.
        </p>

        <div className={s.row}>
          <div className={s.panel}>
            <span className={s.componentLabel}>BUTTON</span>
            <div className={s.stack12}>
              <Button variant="attention">Primary, attention</Button>
              <Button variant="action">Primary, action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="secondary" disabled>
                Disabled
              </Button>
              <Button variant="action" loading>
                Loading
              </Button>
            </div>
          </div>

          <div className={[s.panel, s.panelStack].join(' ')}>
            <div>
              <span className={s.componentLabel}>CHIP</span>
              <div className={s.wrapChips}>
                <Chip selected={chipSelected} onClick={() => setChipSelected((v) => !v)}>
                  {chipSelected ? 'Selected' : 'Default'}
                </Chip>
                <Chip disabled>Disabled</Chip>
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>SEGMENTED CONTROL</span>
              <div className={s.rowTop}>
                <SegmentedControl
                  className={s.segDemo}
                  ariaLabel="Intake mode"
                  value={segValue}
                  onChange={setSegValue}
                  options={[
                    { value: 'type', label: 'Type it' },
                    { value: 'guide', label: 'Guide me' },
                  ]}
                />
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>SURFACE BADGE</span>
              <div className={s.badgeRow}>
                {BADGE_SURFACES.map(({ surface, tint }) => (
                  <SurfaceBadge key={surface} surface={surface} tint={tint} />
                ))}
                <SurfaceBadge surface="api" tint="neutral" />
              </div>
            </div>
          </div>

          <div className={[s.panel, s.panelStack].join(' ')}>
            <div>
              <span className={s.componentLabel}>TEXTAREA</span>
              <div className={s.rowTop}>
                <Textarea label="Prompt" hideLabel rows={2} value="" onChange={() => {}} placeholder="Default" />
              </div>
              <Textarea label="Prompt with error" hideLabel value="" onChange={() => {}} error="Error · that is over 2,000 characters" rows={2} />
            </div>
            <div>
              <span className={s.componentLabel}>CHECKLIST ITEM</span>
              <div className={s.checklistDemo}>
                <ChecklistItem index={2} done={checklistA} onToggle={() => setChecklistA((v) => !v)}>
                  To do
                </ChecklistItem>
                <ChecklistItem index={3} done={checklistB} onToggle={() => setChecklistB((v) => !v)}>
                  Done, collapsed
                </ChecklistItem>
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>TOAST &amp; TOOLTIP</span>
              <div className={s.stackGap10}>
                <Toast open tone="ok">
                  Prompt copied
                </Toast>
                <Tooltip label="Read access only">
                  <Chip size="sm">Hover or focus me</Chip>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className={[s.panel, s.panelStack].join(' ')}>
            <div>
              <span className={s.componentLabel}>NODE</span>
              <div className={s.nodeRow}>
                <NodePill kind="hub" tint="cowork">
                  Hub
                </NodePill>
                <NodePill kind="capability">Capability</NodePill>
                <NodePill kind="connector">Connector</NodePill>
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>ICON</span>
              <div className={s.iconRow}>
                {(['sun', 'moon', 'sound', 'soundOff', 'more', 'close', 'arrowRight'] as IconName[]).map((name) => (
                  <span key={name} className={s.iconSwatch}>
                    <Icon name={name} />
                    <span className={s.iconSwatchLabel}>{name}</span>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>BOTTOM SHEET</span>
              <div className={s.sheetPreview}>
                <span className={s.sheetHandle} aria-hidden="true" />
                <p className={s.sheetCopy}>Filters and detail live here on mobile. Drag handle, 24px top radius, sheet spring.</p>
              </div>
            </div>
            <div>
              <span className={s.componentLabel}>MASCOT CONTAINER</span>
              <div className={s.mascotContainer}>
                <Glow variant="hero" tint="cowork" />
                <div className={s.mascotContainerFace}>
                  <Mascot state="idle" size={104} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 MASCOT */}
      <section className={s.section}>
        <span className={s.eyebrow}>05 &nbsp;MASCOT</span>
        <h2 className={s.h2}>Pip, and the folded map</h2>
        <p className={s.intro}>
          A rounded creature with two mitten hands and one prop it never puts down: a sun yellow folded map. The face
          carries the state, the map carries the gesture. Original character, three colours plus terracotta cheeks, no
          light gimmick, nothing borrowed.
        </p>
        <div className={s.mascotGrid}>
          {MASCOT_STATES.map(({ state, label, caption }) => (
            <div key={state} className={s.mascotCard}>
              <div className={s.mascotFace}>
                <Mascot state={state} size="100%" />
              </div>
              <p className={s.mascotState}>{label}</p>
              <p className={s.mascotCaption}>{caption}</p>
            </div>
          ))}
        </div>
        <p className={s.deliverables}>
          deliverables &middot; SVG master &middot; Lottie per state &middot; favicon 16 / 32 / 64 / 192 / 512 &middot; OG
          image 1200 &times; 630
        </p>
      </section>

      {/* 06 MOTION */}
      <section className={s.section}>
        <span className={s.eyebrow}>06 &nbsp;MOTION</span>
        <h2 className={s.h2}>Springs, not curves</h2>
        <p className={s.intro}>
          Three springs cover the product. Everything overshoots slightly and settles. Every entry has a reduced-motion
          fallback, and the media query is already wired into this page.
        </p>
        <div className={s.motionTable}>
          <div className={[s.motionRow, s.motionHead].join(' ')}>
            <span>WHAT</span>
            <span>TRIGGER</span>
            <span>SPRING</span>
            <span>REDUCED MOTION</span>
          </div>
          {motionSpec.map((row) => (
            <div key={row.what} className={s.motionRow}>
              <span className={s.motionWhat}>{row.what}</span>
              <span>{row.trigger}</span>
              <span className={s.motionSpring}>{row.spring}</span>
              <span>{row.reduced}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
