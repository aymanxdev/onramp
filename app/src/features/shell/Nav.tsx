import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon, Mascot, Sheet } from '@/design-system'
import { useTheme, useSound } from '@/hooks'
import { radarUnseenCount } from '@/lib/storage'
import { useCatalogue, loadProof } from '@/features/catalogue'
import s from './Nav.module.css'

const GITHUB_URL = 'https://github.com/aymanxdev/onramp'

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const aria = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button type="button" className={className ?? `${s.iconBtn} ${s.round}`} onClick={toggle} aria-label={aria}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

function SoundToggle({ className }: { className?: string }) {
  const { enabled, toggle } = useSound()
  return (
    <button
      type="button"
      className={className ?? `${s.iconBtn} ${s.round}`}
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Turn sound off' : 'Turn sound on'}
    >
      <Icon name={enabled ? 'sound' : 'soundOff'} />
    </button>
  )
}

/**
 * The product nav (design lines 151 to 162), sticky with the outer header's
 * blurred chrome (lines 69 to 101). Below 480px the two toggle buttons collapse
 * into one "more" button that opens a small sheet, and the GitHub pill drops
 * its star count text so nothing overflows at 360px.
 */
export function Nav() {
  const catalogue = useCatalogue()
  const [stars, setStars] = useState<number | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadProof()
      .then((proof) => {
        if (!cancelled) setStars(proof.stars)
      })
      .catch(() => {
        if (!cancelled) setStars(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const unseen = catalogue ? radarUnseenCount(catalogue.features) : 0
  const ghLabel = stars !== null ? `${stars.toLocaleString('en-GB')} stars on GitHub` : 'Onramp on GitHub'

  return (
    <header className={s.nav}>
      <div className={s.inner}>
        <Link to="/" className={s.brand}>
          <Mascot state="mark" decorative size={30} />
          Onramp
        </Link>
        <div className={s.cluster}>
          <Link to="/new" className={s.radar}>
            {unseen > 0 ? <span aria-label="new items" className={s.dot} /> : null}
            What's new
          </Link>
          <Link to="/map" className={s.map}>
            Map
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" aria-label={ghLabel} className={s.gh}>
            <span aria-hidden="true" className={s.star}>
              ★
            </span>
            <span className={s.starCount}>{stars !== null ? stars.toLocaleString('en-GB') : 'GitHub'}</span>
          </a>
          <span className={s.togglePair}>
            <ThemeToggle />
            <SoundToggle />
          </span>
          <button
            type="button"
            className={`${s.iconBtn} ${s.round} ${s.moreBtn}`}
            onClick={() => setMoreOpen(true)}
            aria-label="More settings"
          >
            <Icon name="more" />
          </button>
        </div>
      </div>
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Settings" side="bottom">
        <div className={s.sheetToggles}>
          {/* Only visible under 480px, where the nav's own "Map" link hides to keep the nav on one row. */}
          <Link to="/map" className={`${s.iconBtn} ${s.sheetMap}`} onClick={() => setMoreOpen(false)}>
            Map
          </Link>
          <ThemeToggle className={`${s.iconBtn} ${s.round}`} />
          <SoundToggle className={`${s.iconBtn} ${s.round}`} />
        </div>
      </Sheet>
    </header>
  )
}
