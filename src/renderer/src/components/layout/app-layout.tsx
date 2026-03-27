import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@renderer/lib/motion'
import { Sidebar } from '@renderer/components/layout/sidebar'
import { CommandPaletteProvider } from '@renderer/components/shared/command-palette'
import { useCommandPaletteItems } from '@renderer/hooks/useCommandPaletteItems'
import { useGlobalKeyboardShortcuts } from '@renderer/hooks/useGlobalKeyboardShortcuts'

export function AppLayout(): React.JSX.Element {
  const location = useLocation()
  const paletteItems = useCommandPaletteItems()

  useGlobalKeyboardShortcuts()

  return (
    <CommandPaletteProvider defaultItems={paletteItems}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Sidebar — collapsible between 56px and 240px */}
        <Sidebar />

        {/* Content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Drag region for custom titlebar — transparent, just for dragging */}
          <div className="drag-region h-10 w-full flex-shrink-0" />

          {/* Main content — fills remaining height, route transitions via AnimatePresence */}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex min-h-0 flex-1 flex-col"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
