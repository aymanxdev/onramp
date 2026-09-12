/**
 * Input hygiene for the "Type it" text (DEVELOPER_BRIEF section 9: "2,000 characters,
 * UTF-8, strip control characters, reject binary").
 */

/** ASCII control characters (C0 and DEL), expressed as escapes so no literal byte lands in source. */
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')
const NUL = String.fromCharCode(0)
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd)

/**
 * Decodes a request body strictly as UTF-8. Throws when the bytes are not valid UTF-8,
 * which is how we catch binary payloads before they ever become a JS string.
 */
export function decodeUtf8Strict(bytes: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)
}

/**
 * True when the text still carries binary markers after a strict UTF-8 decode: a literal
 * NUL byte, or a replacement character (U+FFFD), which a fatal decode should already have
 * caught but a second check costs nothing and guards a lenient decoder somewhere upstream.
 */
export function looksBinary(text: string): boolean {
  return text.includes(NUL) || text.includes(REPLACEMENT_CHAR)
}

/** Strips control characters and collapses surrounding whitespace, keeps everything else. */
export function stripControlChars(text: string): string {
  return text.replace(CONTROL_CHARS, '').trim()
}
