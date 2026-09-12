/**
 * Supplemental copy for the Map. Most strings live in `@/content/map`
 * (package D); these are the ones that file does not cover, per
 * BUILD_CONTRACT ("if a string is missing add a local constant and list
 * it"). Listed in the package F report:
 *
 * - `planToggle` ("Plan required") reads as a different control to the
 *   design's "MY PLAN ONLY" dashed chip (line 1622). Local labels below
 *   match the design; `map.planToggle` is unused here.
 * - `afterLabel` ("Shipped after") is shorter than the designer brief's
 *   slider label ("Show me what shipped after", section 6a). Used the
 *   longer form below since the slider has room for it.
 */
export const mapLocal = {
  statsTemplate: (surfaces: number, connectors: number) => `${surfaces} surfaces · ${connectors}+ connectors`,
  filtersSheetTrigger: 'Filters',
  filtersSheetTitle: 'Filter the map',
  planChipLabel: 'MY PLAN ONLY',
  planChipLabelOn: 'MY PLAN ONLY ✓',
  sliderLabel: 'Show me what shipped after',
  loadingLabel: 'loading the map',
  legend: {
    surface: 'SURFACE',
    capability: 'CAPABILITY',
    connector: 'CONNECTOR',
  },
  canvasAriaLabel: 'Map of Claude surfaces, use arrow keys to move between nodes and Enter to open',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  scrollHint: 'scroll to zoom · drag to move',
  mobileGroupCapabilities: 'WHAT YOU SWITCH ON',
  docsCta: 'Official docs',
  kindLabels: {
    surface: 'SURFACE',
    capability: 'CAPABILITY',
    connector: 'CONNECTOR',
    skill: 'SKILL',
    plugin: 'PLUGIN',
    plan: 'PLAN',
    usecase: 'USE CASE',
    feature: 'FEATURE',
  } as Record<string, string>,
  graphStatsTemplate: (nodes: number, edges: number, verified: string) => `${nodes} nodes · ${edges} edges · ${verified}`,
}
