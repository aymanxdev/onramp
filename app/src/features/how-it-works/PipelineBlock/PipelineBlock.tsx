/**
 * Block 3, "THE PIPELINE" (design lines 742 to 770): three stages, each with
 * a live artefact preview. Withholds the merge rules and the fetch list,
 * shows only a fetched page title, a graph cluster and a catalogue entry.
 */
import { Card, MonoLabel, StatusDot } from '@/design-system'
import { useCatalogue } from '@/features/catalogue'
import { useProof } from '../useProof'
import { how } from '@/content/how'
import { howLocal } from '../content'
import s from './PipelineBlock.module.css'

/** Short display forms for connector/capability ids, e.g. "microsoft-365" -> "m365". */
const SHORT_FORM: Record<string, string> = {
  'microsoft-365': 'm365',
  'scheduled-tasks': 'task',
  'google-drive': 'g-drive',
  'google-calendar': 'g-cal',
}

function shortForm(id: string): string {
  return SHORT_FORM[id] ?? id.split('-')[0]
}

function hoursSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000))
}

function KnowledgeGraphIllustration() {
  return (
    <svg viewBox="0 0 120 56" className={s.clusterSvg} aria-hidden="true">
      <g stroke="var(--border-strong)" strokeWidth="1" fill="none">
        <path d="M24 28 L54 14" />
        <path d="M24 28 L54 42" />
        <path d="M54 14 L92 22" />
        <path d="M54 42 L92 38" />
      </g>
      <circle cx="24" cy="28" r="8" fill="var(--accent-action)" />
      <circle cx="54" cy="14" r="5" fill="var(--text-secondary)" />
      <circle cx="54" cy="42" r="5" fill="var(--text-secondary)" />
      <circle cx="92" cy="22" r="3.5" fill="var(--text-muted)" />
      <circle cx="92" cy="38" r="3.5" fill="var(--text-muted)" />
    </svg>
  )
}

export function PipelineBlock({ className }: { className?: string }) {
  const catalogue = useCatalogue()
  const { proof } = useProof()

  const cowork = catalogue?.surfaces.find((s2) => s2.id === 'cowork')
  const tidyInbox = catalogue?.usecases.find((u) => u.id === 'tidy-inbox')
  const steps = how.sections.pipeline.steps

  return (
    <Card className={[s.card, className].filter(Boolean).join(' ')}>
      <MonoLabel as="span" size={10}>
        {how.sections.pipeline.eyebrow}
      </MonoLabel>
      <div className={s.strip}>
        <div className={s.stage}>
          <p className={s.title}>{steps[0].title}</p>
          <p className={s.body}>{steps[0].body}</p>
          <div className={s.preview}>
            <StatusDot tone="ok" className={s.dot} />
            {cowork ? `Getting started with ${cowork.name}` : '—'}
            <br />
            {proof ? howLocal.fetchedTemplate(hoursSince(proof.builtAt)) : howLocal.proofUnavailable}
          </div>
        </div>
        <span className={s.arrow} aria-hidden="true">
          {howLocal.arrow}
        </span>
        <div className={s.stage}>
          <p className={s.title}>{steps[1].title}</p>
          <p className={s.body}>{steps[1].body}</p>
          <KnowledgeGraphIllustration />
        </div>
        <span className={s.arrow} aria-hidden="true">
          {howLocal.arrow}
        </span>
        <div className={s.stage}>
          <p className={s.title}>{steps[2].title}</p>
          <p className={s.body}>{steps[2].body}</p>
          <div className={s.preview}>
            {tidyInbox ? (
              <>
                {tidyInbox.id}
                <br />
                {tidyInbox.routes[0].surface} · {shortForm(tidyInbox.connectors[0])} · {shortForm(tidyInbox.capabilities[0])}
                <br />
                {howLocal.goldenTestPassing}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
