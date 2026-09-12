import { Chip, CopyButton } from '@/design-system'
import { toast } from '@/features/shell'
import { route as routeCopy } from '@/content/route'
import s from './MobileActionBar.module.css'

export type MobileActionBarProps = {
  promptText: string
  routeUrl: string
  goal: string
}

/** The mobile-only sticky action bar: copy, share, start over (design lines 507 to 513). */
export function MobileActionBar({ promptText, routeUrl, goal }: MobileActionBarProps) {
  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: goal, url: routeUrl })
        return
      } catch {
        // Cancelled or unsupported mid-flight; fall through to the clipboard copy.
      }
    }
    try {
      await navigator.clipboard.writeText(routeUrl)
      toast('Link copied')
    } catch {
      // Clipboard can be denied; nothing more we can do here.
    }
  }

  return (
    <div className={s.bar}>
      <span className={s.copy}>
        <CopyButton text={promptText} label={routeCopy.copyPrompt} ariaLabel="Copy prompt, sticky bar" size="lg" variant="action" />
      </span>
      <Chip className={s.share} onClick={onShare}>
        {routeCopy.share}
      </Chip>
      <Chip className={s.startOver} as="a" href="/" aria-label="Start over">
        &#8635;
      </Chip>
    </div>
  )
}
