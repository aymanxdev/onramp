/**
 * UsageLine (BUILD_CONTRACT package D): off by default, only renders once
 * `VITE_SHOW_USAGE` is "true" and the fetched route total clears `VITE_USAGE_MIN`.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { Stats } from '@/features/intake/api'
import { UsageLine } from './UsageLine'

const { fetchStats } = vi.hoisted(() => ({ fetchStats: vi.fn<() => Promise<Stats | null>>() }))

vi.mock('@/features/intake/api', () => ({ fetchStats }))

afterEach(() => {
  vi.unstubAllEnvs()
  fetchStats.mockReset()
})

describe('UsageLine', () => {
  it('renders nothing when the flag is off, and never calls fetchStats', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', 'false')
    render(<UsageLine />)

    expect(screen.queryByText(/used/i)).toBeNull()
    expect(fetchStats).not.toHaveBeenCalled()
  })

  it('renders nothing when the flag is unset', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', '')
    render(<UsageLine />)

    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it('renders the line, with thousands separators, when on and above the threshold', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', 'true')
    vi.stubEnv('VITE_USAGE_MIN', '100')
    fetchStats.mockResolvedValue({ routes: 1234, copied: 500, helpful: 987, asOf: '2026-09-12T00:00:00.000Z' })
    render(<UsageLine />)

    await waitFor(() => {
      expect(screen.getByText('used 1,234 times · 987 found it helpful')).toBeTruthy()
    })
  })

  it('renders nothing when the route total is below the threshold', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', 'true')
    vi.stubEnv('VITE_USAGE_MIN', '100')
    fetchStats.mockResolvedValue({ routes: 42, copied: 10, helpful: 3, asOf: '2026-09-12T00:00:00.000Z' })
    render(<UsageLine />)

    await waitFor(() => expect(fetchStats).toHaveBeenCalled())
    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it('renders nothing when the stats fetch fails', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', 'true')
    fetchStats.mockResolvedValue(null)
    render(<UsageLine />)

    await waitFor(() => expect(fetchStats).toHaveBeenCalled())
    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it('never uses the word "visitors"', async () => {
    vi.stubEnv('VITE_SHOW_USAGE', 'true')
    fetchStats.mockResolvedValue({ routes: 1000, copied: 200, helpful: 150, asOf: '2026-09-12T00:00:00.000Z' })
    render(<UsageLine />)

    await waitFor(() => expect(screen.getByText(/used/i)).toBeTruthy())
    expect(document.body.textContent?.toLowerCase()).not.toContain('visitor')
  })
})
