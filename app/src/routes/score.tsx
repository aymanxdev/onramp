import { createFileRoute, redirect } from '@tanstack/react-router'
import { scoreSearchSchema } from '@/features/score/search'

/** `/score` moved to `/quiz`; redirect here so old shared links keep working, preserving `?s=`. */
export const Route = createFileRoute('/score')({
  validateSearch: scoreSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/quiz', search })
  },
})
