import { createFileRoute } from '@tanstack/react-router'
import { RadarScreen } from '@/features/radar/RadarScreen'
import { radarSearchSchema } from '@/features/radar/search'

export const Route = createFileRoute('/new')({
  validateSearch: radarSearchSchema,
  component: NewRoute,
})

function NewRoute() {
  const search = Route.useSearch()
  return <RadarScreen search={search} />
}
