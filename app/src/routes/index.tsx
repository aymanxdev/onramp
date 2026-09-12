import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { LandingScreen } from '@/features/landing/LandingScreen'

const searchSchema = z.object({
  /** Forces the "since you were here" banner for testing. */
  since: z.enum(['1']).optional(),
})

export const Route = createFileRoute('/')({
  validateSearch: searchSchema,
  component: IndexRoute,
})

function IndexRoute() {
  const { since } = Route.useSearch()
  return <LandingScreen forceSince={since === '1'} />
}
