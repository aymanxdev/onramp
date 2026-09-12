/** The thinking screen's three lines (design lines 341 to 354). Each appears only as its stage actually completes, never on a timer (DESIGNER_BRIEF 6b). */
export const thinking = {
  steps: ['Reading the map', 'Matching your goal', 'Writing your first prompt'] as const,
  showRoute: 'Show the route',
} as const
