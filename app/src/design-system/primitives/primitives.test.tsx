/**
 * Smoke tests for the design system primitives. These assert on plain DOM
 * attributes (`getAttribute`, `toBeTruthy`) rather than jest-dom matchers,
 * since `tests/unit/setup.ts` (owned by package I) does not register the
 * jest-dom `expect` extensions.
 */
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { Button } from './Button/Button'
import buttonStyles from './Button/Button.module.css'
import { Chip } from './Chip/Chip'
import { SegmentedControl } from './SegmentedControl/SegmentedControl'
import { ChecklistItem } from './ChecklistItem/ChecklistItem'
import { CopyButton } from './CopyButton/CopyButton'
import { PromptBlock } from './PromptBlock/PromptBlock'
import { Tooltip } from './Tooltip/Tooltip'

describe('Button', () => {
  it('renders a button with the label', () => {
    render(<Button>Find my route</Button>)
    expect(screen.getByRole('button', { name: 'Find my route' })).toBeTruthy()
  })

  it('renders a router Link with the variant class when `to` is given', async () => {
    const rootRoute = createRootRoute({
      component: () => (
        <Button variant="attention" to="/start">
          Find my route
        </Button>
      ),
    })
    const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) })
    render(<RouterProvider router={router} />)
    const link = await screen.findByRole('link', { name: 'Find my route' })
    expect(link.getAttribute('href')).toBe('/start')
    expect(link.className.split(' ')).toContain(buttonStyles.attention)
  })
})

describe('Chip', () => {
  it('sets aria-pressed when selected', () => {
    render(<Chip selected>Selected</Chip>)
    expect(screen.getByRole('button', { name: 'Selected' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('leaves aria-pressed false when not selected', () => {
    render(<Chip>Default</Chip>)
    expect(screen.getByRole('button', { name: 'Default' }).getAttribute('aria-pressed')).toBe('false')
  })
})

function SegmentedControlHarness() {
  const [value, setValue] = useState('type')
  return (
    <SegmentedControl
      ariaLabel="Intake mode"
      value={value}
      onChange={setValue}
      options={[
        { value: 'type', label: 'Type it' },
        { value: 'guide', label: 'Guide me' },
      ]}
    />
  )
}

describe('SegmentedControl', () => {
  it('switches the active tab on click', () => {
    render(<SegmentedControlHarness />)
    const typeTab = screen.getByRole('tab', { name: 'Type it' })
    const guideTab = screen.getByRole('tab', { name: 'Guide me' })
    expect(typeTab.getAttribute('aria-selected')).toBe('true')
    expect(guideTab.getAttribute('aria-selected')).toBe('false')

    fireEvent.click(guideTab)

    expect(guideTab.getAttribute('aria-selected')).toBe('true')
    expect(typeTab.getAttribute('aria-selected')).toBe('false')
  })
})

function ChecklistItemHarness() {
  const [done, setDone] = useState(false)
  return (
    <ChecklistItem index={1} done={done} onToggle={() => setDone((v) => !v)}>
      Open Cowork in the sidebar
    </ChecklistItem>
  )
}

describe('ChecklistItem', () => {
  it('toggles done state on click', () => {
    render(<ChecklistItemHarness />)
    const item = screen.getByRole('button', { name: /Open Cowork in the sidebar/ })
    expect(item.getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(item)
    expect(item.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(item)
    expect(item.getAttribute('aria-pressed')).toBe('false')
  })

  it('renders a note link as a sibling of the toggle button, never nested inside it', () => {
    render(
      <ChecklistItem index={2} done={false} onToggle={() => {}} note="Settings → Connectors → Microsoft 365" href="https://claude.com/connectors">
        Connect Microsoft 365
      </ChecklistItem>,
    )
    const button = screen.getByRole('button', { name: 'Connect Microsoft 365' })
    const link = screen.getByRole('link', { name: 'Settings → Connectors → Microsoft 365' })
    expect(button.contains(link)).toBe(false)
    expect(link.contains(button)).toBe(false)
  })
})

describe('PromptBlock', () => {
  it('falls back to "[label]", not "[key]", for a placeholder with no value', () => {
    render(
      <PromptBlock
        template="Tidy my inbox in {{tone}}."
        values={{}}
        labels={{ tone: 'a friendly tone' }}
        editing={false}
        onChange={() => {}}
      />,
    )
    expect(screen.getByText('[a friendly tone]')).toBeTruthy()
  })

  it('falls back to the raw key when no label is given for it', () => {
    render(<PromptBlock template="Tidy my inbox in {{tone}}." values={{}} editing={false} onChange={() => {}} />)
    expect(screen.getByText('[tone]')).toBeTruthy()
  })
})

describe('CopyButton', () => {
  it('copies to the clipboard and shows Copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<CopyButton text="Tidy my inbox every morning." />)
    const button = screen.getByRole('button', { name: 'Copy prompt' })
    fireEvent.click(button)

    expect(writeText).toHaveBeenCalledWith('Tidy my inbox every morning.')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy()
  })
})

describe('Tooltip', () => {
  it('renders the bubble as a child of document.body, with the label text, when open', () => {
    render(
      <Tooltip label="Switch to light theme">
        <button type="button">Theme</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'Theme' })
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.mouseEnter(trigger)

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip.textContent).toBe('Switch to light theme')
    expect(tooltip.parentElement).toBe(document.body)
  })
})
