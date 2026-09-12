/** The four global keyboard shortcuts, registered in `routes/__root.tsx` and listed in the ShortcutSheet. */
export const shortcuts = [
  { key: '/', description: 'Focus the intake' },
  { key: 'c', description: 'Copy the prompt on a Route' },
  { key: 'm', description: 'Open the map' },
  { key: '?', description: 'Show this list' },
] as const

export const shortcutSheetTitle = 'Keyboard shortcuts'
