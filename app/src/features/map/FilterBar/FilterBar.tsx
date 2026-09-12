/**
 * Search, the four type chips, the plan chip and the time slider. Under
 * 768px the type/plan filters and the slider move into a bottom Sheet behind
 * a single "Filters" chip, sat inline to the right of the search box so it
 * never has to sit alone on its own row (designer brief section 10: filters
 * are a sheet on mobile); search always stays inline.
 */
import { useState } from 'react'
import { Chip, Input, Sheet } from '@/design-system'
import type { MapTypeFilter } from '../graph-data'
import { mapLocal } from '../content'
import { map } from '@/content/map'
import { TimeSlider } from '../TimeSlider/TimeSlider'
import s from './FilterBar.module.css'

export type FilterBarProps = {
  q: string
  onQChange: (q: string) => void
  type: MapTypeFilter
  onTypeChange: (type: MapTypeFilter) => void
  plan: boolean
  onPlanChange: (plan: boolean) => void
  after: string | null
  onAfterChange: (after: string | null) => void
  isMobile: boolean
}

const TYPE_ORDER: MapTypeFilter[] = ['all', 'surfaces', 'capabilities', 'connectors']

export function FilterBar({ q, onQChange, type, onTypeChange, plan, onPlanChange, after, onAfterChange, isMobile }: FilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const typeChips = (
    <>
      {TYPE_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          className={[s.chip, type === option ? s.chipActive : null].filter(Boolean).join(' ')}
          onClick={() => onTypeChange(option)}
          aria-pressed={type === option}
        >
          {map.filters[option]}
        </button>
      ))}
      <button
        type="button"
        className={[s.planChip, plan ? s.planChipActive : null].filter(Boolean).join(' ')}
        onClick={() => onPlanChange(!plan)}
        aria-pressed={plan}
      >
        {plan ? mapLocal.planChipLabelOn : mapLocal.planChipLabel}
      </button>
    </>
  )

  const searchField = (
    <Input
      label={map.searchAriaLabel}
      hideLabel
      value={q}
      onChange={(event) => onQChange(event.target.value)}
      placeholder={map.searchPlaceholder}
      className={s.searchInput}
    />
  )

  return (
    <div className={s.wrap}>
      {isMobile ? (
        <>
          <div className={s.searchRow}>
            <div className={s.searchField}>{searchField}</div>
            <Chip onClick={() => setSheetOpen(true)} className={s.filtersChip}>
              {mapLocal.filtersSheetTrigger}
            </Chip>
          </div>
          <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={mapLocal.filtersSheetTitle} side="bottom">
            <div className={s.sheetChips}>{typeChips}</div>
            <TimeSlider value={after} onChange={onAfterChange} className={s.sheetSlider} />
          </Sheet>
        </>
      ) : (
        <>
          <div className={s.search}>{searchField}</div>
          <div className={s.chipsRow}>{typeChips}</div>
          <TimeSlider value={after} onChange={onAfterChange} className={s.slider} />
        </>
      )}
    </div>
  )
}
