import { Card, CardTitle, CopyButton } from '@/design-system'
import { route as routeCopy } from '@/content/route'
import s from './ThenTry.module.css'

export type ThenTryProps = {
  followUps: [string, string]
}

/** "Then try": two follow-up prompts, each with its own mini copy button (design lines 491 to 503). */
export function ThenTry({ followUps }: ThenTryProps) {
  return (
    <Card>
      <CardTitle>{routeCopy.thenTry}</CardTitle>
      <div className={s.list}>
        {followUps.map((prompt) => (
          <div key={prompt} className={s.row}>
            <span className={s.text}>{prompt}</span>
            <CopyButton text={prompt} variant="mini" size="sm" label="Copy" ariaLabel="Copy follow-up prompt" />
          </div>
        ))}
      </div>
    </Card>
  )
}
