import { useEffect, useState } from 'react'
import { fetchStats } from '@/features/intake/api'
import s from './UsageLine.module.css'

const DEFAULT_USAGE_MIN = 100

function parseUsageMin(raw: string | undefined): number {
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_USAGE_MIN
}

/**
 * A quiet, optional usage line (DEVELOPER_BRIEF 15a running totals), off by default.
 * Renders nothing unless the owner sets `VITE_SHOW_USAGE=true`, the stats fetch
 * succeeds, and the running route total clears `VITE_USAGE_MIN` (default 100), so a
 * brand new deployment never shows a small, discouraging number. Counts only, never a
 * visitor figure.
 */
export function UsageLine() {
  const showUsage = import.meta.env.VITE_SHOW_USAGE === 'true'
  const usageMin = parseUsageMin(import.meta.env.VITE_USAGE_MIN as string | undefined)
  const [line, setLine] = useState<string | null>(null)

  useEffect(() => {
    if (!showUsage) return
    let cancelled = false
    fetchStats().then((stats) => {
      if (cancelled || !stats || stats.routes < usageMin) return
      const routes = stats.routes.toLocaleString('en-GB')
      const helpful = stats.helpful.toLocaleString('en-GB')
      setLine(`used ${routes} times · ${helpful} found it helpful`)
    })
    return () => {
      cancelled = true
    }
  }, [showUsage, usageMin])

  if (!line) return null

  return <p className={s.line}>{line}</p>
}
