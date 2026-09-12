import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import s from './Button.module.css'

export type ButtonVariant = 'attention' | 'action' | 'secondary' | 'ghost'
export type ButtonSize = 'lg' | 'md'

type Shared = {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  block?: boolean
  className?: string
  children?: ReactNode
}

export type ButtonProps =
  | (Shared & ButtonHTMLAttributes<HTMLButtonElement> & { as?: undefined; href?: undefined; to?: undefined })
  | (Shared & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string; to?: undefined })
  | (Shared & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string; as?: undefined; href?: undefined })

function isRouterLink(props: ButtonProps): props is Extract<ButtonProps, { to: string }> {
  return typeof props.to === 'string' && props.to.length > 0
}

function isAnchorTag(props: ButtonProps): props is Extract<ButtonProps, { as: 'a' }> {
  return props.as === 'a'
}

/** Own props to strip before spreading the rest onto the underlying DOM element. */
const OWN_KEYS = ['as', 'to', 'href', 'variant', 'size', 'loading', 'block', 'className', 'children'] as const
type OwnKey = (typeof OWN_KEYS)[number]

function nativeProps<T extends object>(props: T): Omit<T, OwnKey> {
  const rest = { ...props } as Record<string, unknown>
  for (const key of OWN_KEYS) delete rest[key]
  return rest as Omit<T, OwnKey>
}

function LoadingDots() {
  return (
    <span className={s.dots} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

/**
 * Chunky pill button. Renders a `<button>` by default, an `<a>` when `as="a"` and
 * `href` are given, or a TanStack Router `<Link>` when `to` is given.
 */
export function Button(props: ButtonProps) {
  const { variant = 'attention', size = 'lg', loading, block, className, children } = props
  const cls = [s.button, s[variant], size === 'md' ? s.md : null, block ? s.block : null, loading ? s.loading : null, className]
    .filter(Boolean)
    .join(' ')
  const content = loading ? (
    <>
      <LoadingDots />
      {children}
    </>
  ) : (
    children
  )

  if (isRouterLink(props)) {
    return (
      <Link to={props.to} className={cls} {...nativeProps(props)}>
        {content}
      </Link>
    )
  }
  if (isAnchorTag(props)) {
    return (
      <a href={props.href} className={cls} {...nativeProps(props)}>
        {content}
      </a>
    )
  }
  return (
    <button type="button" className={cls} disabled={props.disabled || loading} {...nativeProps(props)}>
      {content}
    </button>
  )
}
