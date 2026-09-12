import type { SVGAttributes } from 'react'

export type IconName = 'sun' | 'moon' | 'sound' | 'soundOff' | 'more' | 'close' | 'arrowRight'

export type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'width' | 'height' | 'viewBox'> & {
  name: IconName
  /** Square size in px. Default 20, per the design system's icon grid. */
  size?: number
  className?: string
}

/**
 * Original line-art glyphs, 20px on a 20x20 grid, stroke `currentColor` at
 * 1.75px with round caps and joins. Always `aria-hidden`: the control that
 * hosts an icon (a button with its own `aria-label`, a `Tooltip`) carries the
 * accessible name.
 */
function Path({ name }: { name: IconName }) {
  switch (name) {
    case 'sun':
      return (
        <>
          <circle cx="10" cy="10" r="4" />
          <path d="M10 1.6v2.3M10 16.1v2.3M18.4 10h-2.3M3.9 10H1.6M15.6 4.4l-1.6 1.6M6 14l-1.6 1.6M15.6 15.6L14 14M6 6 4.4 4.4" />
        </>
      )
    case 'moon':
      return <path d="M14.2 3.3a7.1 7.1 0 1 0 3.4 13A8.6 8.6 0 0 1 14.2 3.3Z" />
    case 'sound':
      return (
        <>
          <path d="M4 7.8h3l4.4-3.5v11.4L7 12.2H4z" />
          <path d="M13.9 7.4a4.3 4.3 0 0 1 0 5.2M16.4 5a7.6 7.6 0 0 1 0 10" />
        </>
      )
    case 'soundOff':
      return (
        <>
          <path d="M4 7.8h3l4.4-3.5v11.4L7 12.2H4z" />
          <path d="M14 7.6l4.3 4.8M18.3 7.6 14 12.4" />
        </>
      )
    case 'more':
      return (
        <>
          <circle cx="4.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15.5" cy="10" r="1.1" fill="currentColor" stroke="none" />
        </>
      )
    case 'close':
      return <path d="M5 5l10 10M15 5 5 15" />
    case 'arrowRight':
      return <path d="M3.5 10h13M12 5.8l4.2 4.2-4.2 4.2" />
  }
}

export function Icon({ name, size = 20, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <Path name={name} />
    </svg>
  )
}
