import { useState } from 'react'
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useShortcut } from '@/hooks'
import { Nav, Footer, NotFoundPage, ShortcutSheet, ErrorBoundary, ToastHost } from '@/features/shell'
import s from '@/features/shell/AppShell.module.css'

function AppShell() {
  const navigate = useNavigate()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  useShortcut('/', () => {
    void navigate({ to: '/start' }).then(() => {
      window.dispatchEvent(new CustomEvent('onramp:focus-intake'))
    })
  })
  useShortcut('m', () => {
    void navigate({ to: '/map' })
  })
  useShortcut('?', () => setShortcutsOpen(true))
  useShortcut('c', () => {
    window.dispatchEvent(new CustomEvent('onramp:copy-prompt'))
  })

  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="content" tabIndex={-1} className={`page ${s.page}`}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <ShortcutSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastHost />
    </>
  )
}

export const Route = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
})
