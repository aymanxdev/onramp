import { useLocalStorage } from './useLocalStorage'

export type IntakeModePreference = 'type' | 'guide'

/** Remembers whether the person prefers Type it or Guide me, key "intake-mode", default "type". */
export function useIntakeMode(): [IntakeModePreference, (mode: IntakeModePreference) => void] {
  const [mode, setMode] = useLocalStorage<IntakeModePreference>('intake-mode', 'type')
  return [mode, setMode]
}
