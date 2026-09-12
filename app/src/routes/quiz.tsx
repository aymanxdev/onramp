import { createFileRoute } from '@tanstack/react-router'
import { ScoreScreen } from '@/features/score/ScoreScreen'
import { scoreSearchSchema } from '@/features/score/search'

export const Route = createFileRoute('/quiz')({
  validateSearch: scoreSearchSchema,
  component: QuizRoute,
})

function QuizRoute() {
  const search = Route.useSearch()
  return <ScoreScreen search={search} />
}
