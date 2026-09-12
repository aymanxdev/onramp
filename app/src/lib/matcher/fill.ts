import type { Placeholder } from './types'

const PLACEHOLDER_TOKEN = /\{\{\s*([\w-]+)\s*\}\}/g

/**
 * Replaces {{key}} tokens in a prompt template with the matching value, or
 * "[label]" when the value is empty. `placeholders` supplies the human label for
 * each key; when omitted (or a key is missing from it) the key itself is used.
 */
export function fillPrompt(template: string, values: Record<string, string>, placeholders?: Placeholder[]): string {
  return template.replace(PLACEHOLDER_TOKEN, (_match, key: string) => {
    const value = values[key]
    if (value && value.trim().length > 0) return value
    const label = placeholders?.find((placeholder) => placeholder.key === key)?.label ?? key
    return `[${label}]`
  })
}
