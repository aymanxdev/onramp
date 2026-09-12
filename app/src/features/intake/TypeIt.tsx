import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Button, Chip, MonoLabel, Textarea, ThumbBar } from '@/design-system'
import { Mascot } from '@/design-system/mascot/Mascot'
import { usePrefersReducedMotion } from '@/hooks'
import { intake, exampleChips, PLACEHOLDERS } from '@/content/intake'
import type { StartSearch } from './search'
import s from './TypeIt.module.css'

const ROTATE_MS = 2400
const COUNTER_FROM = 1600
const COUNTER_WARN = 1900
const MAX_LENGTH = 2000

export type TypeItProps = {
  search: StartSearch
}

/** The "Type it" intake mode: one big textarea, rotating placeholders, example chips. */
export function TypeIt({ search }: TypeItProps) {
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const [text, setText] = useState(search.q ?? '')
  const [focused, setFocused] = useState(false)
  const [phIndex, setPhIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (text.length > 0 || focused) return
    const timer = setInterval(() => setPhIndex((i) => (i + 1) % PLACEHOLDERS.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [text, focused])

  useEffect(() => {
    function onFocusIntake() {
      textareaRef.current?.focus()
    }
    window.addEventListener('onramp:focus-intake', onFocusIntake)
    return () => window.removeEventListener('onramp:focus-intake', onFocusIntake)
  }, [])

  useEffect(() => {
    const node = textareaRef.current
    if (!node) return
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    node.addEventListener('focus', onFocus)
    node.addEventListener('blur', onBlur)
    return () => {
      node.removeEventListener('focus', onFocus)
      node.removeEventListener('blur', onBlur)
    }
  }, [])

  const isHello = text.trim().toLowerCase() === intake.easterEgg
  const submit = () => {
    if (!text.trim()) return
    navigate({ to: '/start', search: { ...search, mode: 'type', q: text, go: '1' } })
  }

  return (
    <div>
      <h1 className={s.h1}>{intake.heading}</h1>
      <p className={s.sub}>{intake.sub}</p>
      <div className={s.fieldWrap}>
        <motion.div layoutId={reducedMotion ? undefined : 'goal-text'}>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={setText}
            label={intake.goalLabel}
            placeholder={PLACEHOLDERS[phIndex]}
            rows={5}
            maxLength={MAX_LENGTH}
            counterFrom={Number.MAX_SAFE_INTEGER}
          />
        </motion.div>
        {isHello && (
          <div className={s.easterEgg}>
            <Mascot state="waving" size={64} label="Pip says hello back" />
          </div>
        )}
      </div>
      <div className={s.counterRow}>
        <MonoLabel tone="muted">{intake.exampleLabel}</MonoLabel>
        {text.length > COUNTER_FROM && (
          <span className={[s.count, text.length > COUNTER_WARN ? s.countWarn : null].filter(Boolean).join(' ')}>
            {text.length} / {MAX_LENGTH}
          </span>
        )}
      </div>
      <div className={s.chips}>
        {exampleChips.map((chip) => (
          <Chip key={chip.label} onClick={() => setText(chip.fill)}>
            {chip.label}
          </Chip>
        ))}
      </div>
      <ThumbBar>
        <Button variant="attention" block disabled={!text.trim()} onClick={submit}>
          {intake.find}
        </Button>
      </ThumbBar>
    </div>
  )
}
