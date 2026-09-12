import { DISCLAIMER } from './footer'

/** Copy for /about (DEVELOPER_BRIEF sections 14 and 15, DESIGNER_BRIEF section 4). */
export const about = {
  eyebrow: 'ABOUT',
  h1: 'About Onramp',
  tagline: 'The on-ramp to everything Claude can do. Unofficial, free, open source.',
  disclaimer: DISCLAIMER,
  whatItIs:
    'Onramp is a small, free tool that turns "what are you trying to do?" into a route through Claude: the surface to open, what to switch on, and the exact first prompt to paste. There is no login and nothing you type is stored.',
  howBuiltIntro: 'Every route comes from a catalogue of surfaces, capabilities, connectors and use cases that a person checked against the official Claude documentation, not from a model guessing on the spot.',
  howBuiltLinkLabel: 'Read how routes are built',
  howBuiltHref: '/how-it-works',
  repo: {
    label: 'Onramp on GitHub',
    href: 'https://github.com/aymanxdev/onramp',
  },
  licences: {
    heading: 'Licences',
    code: 'The Onramp code is licensed AGPL-3.0. Anyone can run, study and modify it, and anyone who runs a modified copy as a service must share their changes.',
    catalogue: 'The catalogue of surfaces, capabilities and use cases is licensed CC BY 4.0.',
    attributionsHeading: 'Built with',
    attributions: [
      { name: 'Graphify', licence: 'MIT', note: 'builds the graph of surfaces, capabilities and use cases from the docs corpus' },
      { name: 'Motion', licence: 'MIT', note: 'drives the named springs behind every animation' },
      { name: 'IBM Plex Sans and IBM Plex Mono', licence: 'SIL Open Font Licence', note: 'the two typefaces used throughout' },
      { name: 'MiniSearch', licence: 'MIT', note: 'the deterministic matcher that turns a goal into a use case' },
    ] as const,
  },
  designSystemNote: 'The design system is documented at ',
  designSystemHref: '/design-system',
  designSystemLinkLabel: '/design-system',
} as const
