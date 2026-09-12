import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, MonoLabel } from '@/design-system'
import { states } from '@/content/states'
import s from './ErrorState.module.css'

/** The offline or error card, design lines 669 to 675, rendered by `ErrorBoundary` below. */
export function ErrorState({ detail, onRetry }: { detail?: string; onRetry: () => void }) {
  const copy = states.offline
  return (
    <div className={s.card}>
      <MonoLabel tone="warn">{copy.eyebrow}</MonoLabel>
      <h2 className={s.heading}>{copy.heading}</h2>
      <p className={s.body}>{copy.body}</p>
      {detail ? <div className={s.detail}>{detail}</div> : null}
      <Button variant="secondary" onClick={onRetry}>
        {copy.button}
      </Button>
    </div>
  )
}

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * Catches render errors anywhere under `<Outlet />` and swaps them for the
 * offline/error card. "Try again now" resets the boundary; the Nav and
 * Footer live outside this component so they stay on screen throughout.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No third-party error reporting: nothing here is sent anywhere (DEVELOPER_BRIEF non-negotiable 1).
    if (import.meta.env.DEV) console.error(error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      return <ErrorState detail={this.state.error.message} onRetry={this.reset} />
    }
    return this.props.children
  }
}
