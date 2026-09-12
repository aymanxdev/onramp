/**
 * A tiny base64url <-> JSON codec for the prompt card's `v` search param (the
 * "Make it mine" values, so a shared card link reproduces the edited prompt).
 * This is deliberately separate from `@/lib/matcher/encode`, which only knows
 * how to encode an `Intake`, not an arbitrary values map.
 */
export function encodeValues(values: Record<string, string>): string {
  const json = JSON.stringify(values)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeValues(value: string | undefined): Record<string, string> {
  if (!value) return {}
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const json = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    const parsed: unknown = JSON.parse(json)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, string> = {}
      for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof val === 'string') out[key] = val
      }
      return out
    }
    return {}
  } catch {
    return {}
  }
}
