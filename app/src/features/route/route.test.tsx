/**
 * RouteScreen against the real catalogue.json (BUILD_CONTRACT: package E owns this
 * test). Renders the tidy-inbox use case end to end: goal, checklist, badge, prompt
 * placeholder, "Make it mine" and the setup progress count.
 *
 * `useCatalogue` is mocked to return the catalogue read straight from disk rather
 * than going through `fetch`, so the test does not depend on a dev server or MSW;
 * every other export of `@/features/catalogue` (daysSince, formatVerified, ...) is
 * the real implementation.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import type { Catalogue } from '@/features/catalogue/types'
import { encodeIntake } from '@/lib/matcher'
import { RouteScreen } from './RouteScreen'

const catalogue: Catalogue = JSON.parse(
  readFileSync(resolve(__dirname, '../../../public/data/catalogue.json'), 'utf8'),
) as Catalogue

vi.mock('@/features/catalogue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/catalogue')>()
  return { ...actual, useCatalogue: () => catalogue }
})

const tidyInboxId = encodeIntake({ mode: 'usecase', usecase: 'tidy-inbox' })

function renderRouteScreen(id: string) {
  const rootRoute = createRootRoute({ component: () => <RouteScreen id={id} /> })
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) })
  return render(<RouterProvider router={router} />)
}

describe('RouteScreen (tidy-inbox)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('renders the goal, the COWORK badge and the four checklist steps', async () => {
    renderRouteScreen(tidyInboxId)

    expect(await screen.findByText(/tidy my inbox/i)).toBeTruthy()
    expect(screen.getByText('COWORK')).toBeTruthy()

    const usecase = catalogue.usecases.find((u) => u.id === 'tidy-inbox')
    expect(usecase?.setup).toHaveLength(4)
    for (const step of usecase?.setup ?? []) {
      expect(screen.getByText(step.text)).toBeTruthy()
    }
    expect(screen.getByText('0 OF 4 DONE')).toBeTruthy()
  })

  it('shows the prompt with the "[300 words]" placeholder before it is edited', async () => {
    renderRouteScreen(tidyInboxId)
    await screen.findByText(/tidy my inbox/i)
    expect(screen.getByText(/\[300 words\]/)).toBeTruthy()
  })

  it('shows two inputs once "Make it mine" is clicked', async () => {
    renderRouteScreen(tidyInboxId)
    await screen.findByText(/tidy my inbox/i)

    fireEvent.click(screen.getByText('Make it mine'))

    // Two placeholders (length, sender) become editable text inputs.
    const textInputs = document.querySelectorAll('input')
    expect(textInputs.length).toBe(2)
  })

  it('updates the setup progress count when a step is ticked', async () => {
    renderRouteScreen(tidyInboxId)
    const usecase = catalogue.usecases.find((u) => u.id === 'tidy-inbox')
    const firstStepText = usecase?.setup[0]?.text ?? ''
    await screen.findByText(firstStepText)

    fireEvent.click(screen.getByText(firstStepText))

    expect(await screen.findByText('1 OF 4 DONE')).toBeTruthy()
  })
})
