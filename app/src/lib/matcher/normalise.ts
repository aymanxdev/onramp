/**
 * Turns free text into a stable, comparable form before it is searched. Used on typed
 * intake text and, term by term, inside the search index (see match.ts) so that a
 * British spelling and its American cousin land on the same token.
 */

const MAX_LENGTH = 2000

/** Matches ASCII control characters (C0 and DEL) so they can be stripped. */
// eslint-disable-next-line no-control-regex -- intentional: this is the control-character strip.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]', 'g')

/**
 * The common British/American spelling pairs worth folding for matching. Deliberately
 * small: this is not a general spelling corrector, just enough that "summarize" and
 * "summarise" hit the same use cases.
 */
const SPELLING_FOLDS: Record<string, string> = {
  summarize: 'summarise',
  summarizes: 'summarises',
  summarized: 'summarised',
  summarizing: 'summarising',
  organize: 'organise',
  organizes: 'organises',
  organized: 'organised',
  organizing: 'organising',
  organization: 'organisation',
  organizations: 'organisations',
  analyze: 'analyse',
  analyzes: 'analyses',
  analyzed: 'analysed',
  analyzing: 'analysing',
  color: 'colour',
  colors: 'colours',
  colored: 'coloured',
  coloring: 'colouring',
}

/** Folds a single lower-cased word to its British spelling when a common variant exists. */
export function foldSpelling(word: string): string {
  return SPELLING_FOLDS[word] ?? word
}

/**
 * Lowercases, strips control characters and punctuation (apostrophes kept so "don't"
 * survives as one word), collapses whitespace, folds common American spellings to
 * British ones, and trims to 2000 characters.
 */
export function normalise(text: string): string {
  const withoutControlChars = text.replace(CONTROL_CHARS, ' ')
  const lowered = withoutControlChars.toLowerCase()
  const withoutPunctuation = lowered.replace(/[^\p{L}\p{N}\s']/gu, ' ')
  const collapsed = withoutPunctuation.replace(/\s+/g, ' ').trim()
  const folded = collapsed
    .split(' ')
    .filter(Boolean)
    .map(foldSpelling)
    .join(' ')
  return folded.slice(0, MAX_LENGTH)
}
