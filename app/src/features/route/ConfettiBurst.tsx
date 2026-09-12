import { useMemo } from 'react'
import { motion } from 'motion/react'
import { settle } from '@/design-system/motion'
import s from './ConfettiBurst.module.css'

const COLOURS = ['var(--accent-action)', 'var(--accent-attention)', 'var(--accent-detail)']
const COUNT = 24

type Piece = { x: number; y: number; rotate: number; colour: string; delay: number }

function makePieces(): Piece[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4
    const distance = 40 + Math.random() * 60
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rotate: Math.random() * 360,
      colour: COLOURS[i % COLOURS.length],
      delay: Math.random() * 0.08,
    }
  })
}

/**
 * A one-shot burst of 24 lime, sun and terracotta squares from the copy
 * button on the first completed route in the session (DESIGNER_BRIEF 6b).
 * The parent only renders this component while reduced motion is off and
 * the burst is active, so there is no reduced-motion branch here.
 */
export function ConfettiBurst() {
  const pieces = useMemo(makePieces, [])

  return (
    <span className={s.wrap} aria-hidden="true">
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className={s.square}
          style={{ background: piece.colour }}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
          animate={{ opacity: 0, x: piece.x, y: piece.y, rotate: piece.rotate, scale: 0.6 }}
          transition={{ ...settle, delay: piece.delay }}
        />
      ))}
    </span>
  )
}
