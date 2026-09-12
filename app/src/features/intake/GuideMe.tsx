import { useNavigate } from '@tanstack/react-router'
import { Button, Chip, MonoLabel, ProgressPath, ThumbBar } from '@/design-system'
import { intake, QUESTIONS } from '@/content/intake'
import type { GuideAnswers } from '@/lib/matcher'
import type { StartSearch } from './search'
import s from './GuideMe.module.css'

export type GuideMeProps = {
  search: StartSearch
}

/** The "Guide me" intake mode: one question per step (design lines 311 to 339). */
export function GuideMe({ search }: GuideMeProps) {
  const navigate = useNavigate()
  const step = Math.min(search.step ?? 0, QUESTIONS.length - 1)
  const answers: GuideAnswers = search.a ?? {}
  const question = QUESTIONS[step]
  const answered = answers[question.key]
  const isLast = step === QUESTIONS.length - 1

  const goToStep = (nextStep: number, nextAnswers: GuideAnswers) => {
    navigate({ to: '/start', search: { ...search, mode: 'guide', step: nextStep, a: nextAnswers } })
  }

  const selectOption = (label: string) => {
    const nextAnswers: GuideAnswers = { ...answers, [question.key]: label }
    if (isLast) {
      navigate({ to: '/start', search: { ...search, mode: 'guide', step, a: nextAnswers, go: '1' } })
    } else {
      goToStep(step + 1, nextAnswers)
    }
  }

  const next = () => {
    if (isLast) {
      navigate({ to: '/start', search: { ...search, mode: 'guide', step, a: answers, go: '1' } })
    } else {
      goToStep(step + 1, answers)
    }
  }

  const canAdvance = Boolean(answered) || question.skippable

  return (
    <div>
      <div className={s.path}>
        <ProgressPath step={step} total={QUESTIONS.length} />
      </div>
      <MonoLabel tone="muted">{intake.stepTemplate.replace('{n}', String(step + 1)).replace('{total}', String(QUESTIONS.length))}</MonoLabel>
      <h1 className={s.h1}>{question.title}</h1>
      <p className={s.hint}>{question.hint}</p>
      <div className={s.options}>
        {question.options.map((option) => (
          <Chip key={option} selected={answered === option} onClick={() => selectOption(option)}>
            {option}
          </Chip>
        ))}
      </div>
      {question.skippable && (
        <button type="button" className={s.skip} onClick={next}>
          {intake.skip}
        </button>
      )}
      <ThumbBar>
        <Button variant={isLast ? 'attention' : 'action'} block disabled={!canAdvance} onClick={next}>
          {isLast ? intake.find : intake.next}
        </Button>
      </ThumbBar>
    </div>
  )
}
