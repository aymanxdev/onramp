import { createFileRoute } from '@tanstack/react-router'
import { RouteScreen } from '@/features/route/RouteScreen'

export const Route = createFileRoute('/route/$id')({
  component: RouteIdRoute,
})

function RouteIdRoute() {
  const { id } = Route.useParams()
  return <RouteScreen id={id} />
}
