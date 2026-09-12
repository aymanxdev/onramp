import { useNavigate } from '@tanstack/react-router'
import { BackButton, SegmentedControl } from '@/design-system'
import { useIntakeMode } from '@/hooks'
import { intake } from '@/content/intake'
import type { StartSearch } from './search'
import { TypeIt } from './TypeIt'
import { GuideMe } from './GuideMe'
import s from './IntakeScreen.module.css'

export type IntakeScreenProps = {
  search: StartSearch
}

const SEGMENT_OPTIONS = [
  { value: 'type' as const, label: intake.segment.type },
  { value: 'guide' as const, label: intake.segment.guide },
]

/**
 * Intake shell: back button, the Type it / Guide me segmented control, and
 * the active mode's content (design lines 283 to 339).
 */
export function IntakeScreen({ search }: IntakeScreenProps) {
  const navigate = useNavigate()
  const [modePref, setModePref] = useIntakeMode()
  const mode = search.mode ?? modePref
  const step = search.step ?? 0

  const setMode = (next: 'type' | 'guide') => {
    setModePref(next)
    navigate({ to: '/start', search: { mode: next, step: next === 'guide' ? 0 : undefined }, replace: true })
  }

  const onBack = () => {
    if (mode === 'type' || step === 0) {
      navigate({ to: '/' })
    } else {
      navigate({ to: '/start', search: { ...search, mode, step: step - 1 } })
    }
  }

  return (
    <div className={s.container}>
      {/* BackButton renders its own "←"; content/intake.ts's `back` string includes one too, so it is stripped here to avoid a doubled arrow. */}
      <BackButton onClick={onBack}>{intake.back.replace(/^←\s*/, '')}</BackButton>
      <div className={mode === 'guide' ? s.segmentGuide : s.segment}>
        <SegmentedControl options={SEGMENT_OPTIONS} value={mode} onChange={setMode} ariaLabel="Intake mode" />
      </div>
      {mode === 'type' ? <TypeIt search={search} /> : <GuideMe search={search} />}
    </div>
  )
}
