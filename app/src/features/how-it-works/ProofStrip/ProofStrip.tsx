/**
 * Block 6, the proof strip (design lines 799 to 805): commit, catalogue
 * version, link check date, golden tests, Lighthouse, all pulled from
 * proof.json at build time. A failed load renders "unavailable" in
 * state-warn for every field, never a guessed number.
 */
import { useProof } from '../useProof'
import { how } from '@/content/how'
import { howLocal } from '../content'
import s from './ProofStrip.module.css'

function Field({ label, value, tone = 'primary' }: { label: string; value: string; tone?: 'primary' | 'ok' | 'warn' }) {
  return (
    <span>
      {label} <span className={tone === 'ok' ? s.ok : tone === 'warn' ? s.warn : s.value}>{value}</span>
    </span>
  )
}

export function ProofStrip({ className }: { className?: string }) {
  const { proof, failed } = useProof()

  if (failed || !proof) {
    return (
      <div className={[s.strip, className].filter(Boolean).join(' ')}>
        <Field label={how.proof.commit} value={howLocal.proofUnavailable} tone="warn" />
        <Field label={how.proof.catalogue} value={howLocal.proofUnavailable} tone="warn" />
        <Field label={how.proof.linksChecked} value={howLocal.proofUnavailable} tone="warn" />
        <Field label={how.proof.goldenTests} value={howLocal.proofUnavailable} tone="warn" />
        <Field label={how.proof.lighthouse} value={howLocal.proofUnavailable} tone="warn" />
      </div>
    )
  }

  const { lighthouse } = proof

  return (
    <div className={[s.strip, className].filter(Boolean).join(' ')}>
      <Field label={how.proof.commit} value={proof.commit} />
      <Field label={how.proof.catalogue} value={proof.catalogueVersion} />
      <Field label={how.proof.linksChecked} value={proof.linkCheck} />
      <Field label={how.proof.goldenTests} value={`${proof.goldenTests} / ${proof.goldenTests}`} tone="ok" />
      <Field
        label={how.proof.lighthouse}
        value={`${lighthouse.performance} ${lighthouse.accessibility} ${lighthouse.bestPractices} ${lighthouse.seo}`}
        tone="ok"
      />
    </div>
  )
}
