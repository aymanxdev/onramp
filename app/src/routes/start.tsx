import { createFileRoute } from '@tanstack/react-router'
import { IntakeScreen } from '@/features/intake/IntakeScreen'
import { Thinking } from '@/features/intake/Thinking'
import { startSearchSchema } from '@/features/intake/search'

export const Route = createFileRoute('/start')({
  validateSearch: startSearchSchema,
  component: StartRoute,
})

function StartRoute() {
  const search = Route.useSearch()

  if (search.go === '1') {
    return <Thinking search={search} />
  }

  return <IntakeScreen search={search} />
}
