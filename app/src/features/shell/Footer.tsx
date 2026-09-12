import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, Mascot } from '@/design-system'
import { settle, reducedFade } from '@/design-system/motion'
import { usePrefersReducedMotion } from '@/hooks'
import { footer, footerLinks, reportWrongRouteHref } from '@/content/footer'
import s from './Footer.module.css'

const PEEK_MS = 2400

/**
 * The disclaimer footer, on every route including error and 404 pages
 * (DEVELOPER_BRIEF section 1 rule 7). On the tenth heart boop, Pip peeks in
 * from the edge for 2.4s (DESIGNER_BRIEF 6b).
 */
export function Footer() {
  const [peeking, setPeeking] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (!peeking) return
    const timer = setTimeout(() => setPeeking(false), PEEK_MS)
    return () => clearTimeout(timer)
  }, [peeking])

  return (
    <footer className={s.footer}>
      <div className={s.copy}>
        <p className={s.line1}>
          {footer.madeWith} <Heart onTenth={() => setPeeking(true)} /> {footer.forClaudeInLondon}
        </p>
        <p className={s.disclaimer}>{footer.disclaimer}</p>
        <nav className={s.links} aria-label="More about Onramp">
          {footerLinks.map((link) =>
            link.external ? (
              <a key={link.label} href={link.label === 'Report a wrong route' ? reportWrongRouteHref() : link.href} target={link.href.startsWith('http') ? '_blank' : undefined} rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {link.label}
              </a>
            ) : (
              <Link key={link.label} to={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className={s.pip}>
        <Mascot state="waving" size={96} decorative />
      </div>
      <AnimatePresence>
        {peeking ? (
          <motion.div
            className={s.peekingPip}
            initial={reducedMotion ? { opacity: 0 } : { x: 60, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1, transition: reducedFade } : { x: 0, opacity: 1, transition: settle }}
            exit={reducedMotion ? { opacity: 0, transition: reducedFade } : { x: 60, opacity: 0, transition: settle }}
          >
            <Mascot state="waving" size={96} decorative />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </footer>
  )
}
