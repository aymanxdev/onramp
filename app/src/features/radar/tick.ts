/**
 * DATA.md counters: `radar_story_opened` (once per feature per story open) and
 * `score_completed` (once per bucket-of-10 per result render). The real client lives
 * in `@/features/intake/api` (package H); that file does not exist yet, so this is a
 * no-op stand-in. Swap the body for a re-export once package H ships the endpoint.
 */
export type TickEvent = 'radar_story_opened' | 'score_completed'

export function tick(event: TickEvent, id: string): void {
  // No-op: the edge tick endpoint (`/api/tick`, package H) is not wired up yet.
  void event
  void id
}
