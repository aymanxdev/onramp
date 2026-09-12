import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PromptCardScreen } from '@/features/card/PromptCardScreen'

const searchSchema = z.object({
  /** Base64url JSON of "Make it mine" values, so a shared card link reproduces the edited prompt. */
  v: z.string().optional(),
})

export const Route = createFileRoute('/card/$id')({
  validateSearch: searchSchema,
  component: CardIdRoute,
})

function CardIdRoute() {
  const { id } = Route.useParams()
  const { v } = Route.useSearch()
  return <PromptCardScreen id={id} v={v} />
}
