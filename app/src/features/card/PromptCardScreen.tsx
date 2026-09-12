import { useEffect, useMemo, useState } from 'react'
import { Chip, CopyButton } from '@/design-system'
import { useCatalogue } from '@/features/catalogue'
import { decodeIntake, routeFor, fillPrompt } from '@/lib/matcher'
import { NoMatch } from '@/features/route/NoMatch'
import { PromptCard } from './PromptCard'
import { decodeValues } from './base64Json'
import s from './PromptCardScreen.module.css'

export type PromptCardScreenProps = {
  id: string
  /** The `v` search param: base64url JSON of "Make it mine" values, optional. */
  v?: string
}

const EXPORT_WIDTH = 1080
const CARD_CSS_WIDTH = 340

/** `/card/$id`: the printable, screenshot-ready prompt card (design lines 356 to 383). */
export function PromptCardScreen({ id, v }: PromptCardScreenProps) {
  const catalogue = useCatalogue()
  const [saving, setSaving] = useState(false)

  const intake = useMemo(() => decodeIntake(id), [id])
  const resolved = useMemo(() => (catalogue && intake ? routeFor(catalogue, intake) : null), [catalogue, intake])
  const route = resolved?.route ?? null

  useEffect(() => {
    if (route) document.title = `${route.goal} · Onramp prompt card`
  }, [route])

  if (!intake) return <NoMatch />
  if (!catalogue) return <p className={s.page}>Loading&hellip;</p>
  if (!route || resolved?.result.verdict === 'none') return <NoMatch />

  const values = decodeValues(v)
  const prompt = fillPrompt(route.promptTemplate, values, route.placeholders)
  const siteHost = typeof window !== 'undefined' ? window.location.host : 'onramp.guide'

  const onPrint = () => window.print()

  const onSaveImage = async () => {
    const node = document.getElementById('prompt-card')
    if (!node) return
    setSaving(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(node, {
        pixelRatio: EXPORT_WIDTH / CARD_CSS_WIDTH,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `onramp-${route.usecase.id}.png`
      link.click()
    } catch {
      // html-to-image can fail on cross-origin assets; there is nothing more specific to say here.
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.page}>
      <p className={s.note}>1080 &times; 1350 export &middot; also the print stylesheet</p>
      <PromptCard routeId={id} goal={route.goal} surface={route.surface} prompt={prompt} setup={route.setup} siteHost={siteHost} />
      <div className={s.buttons}>
        <CopyButton text={prompt} label="Copy prompt" size="lg" variant="action" />
        <Chip onClick={onSaveImage} disabled={saving}>
          {saving ? 'Saving…' : 'Save image'}
        </Chip>
        <Chip onClick={onPrint}>Print</Chip>
      </div>
    </div>
  )
}
