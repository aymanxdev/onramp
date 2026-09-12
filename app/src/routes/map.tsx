import { createFileRoute } from '@tanstack/react-router'
import { MapScreen } from '@/features/map'
import { mapSearchSchema } from '@/features/map/search'

export const Route = createFileRoute('/map')({
  validateSearch: mapSearchSchema,
  component: MapRoute,
})

function MapRoute() {
  const search = Route.useSearch()
  return <MapScreen search={search} />
}
