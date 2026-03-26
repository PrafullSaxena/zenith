import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { pageTransition } from '@renderer/lib/motion'
import { Sidebar } from '@renderer/components/layout/sidebar'

export function AppLayout(): React.JSX.Element {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar — collapsible between 56px and 240px */}
      <Sidebar />

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Drag region for custom titlebar — transparent, just for dragging */}
        <div className="drag-region h-8 w-full flex-shrink-0" />

        {/* Main content — fills remaining height, route transitions via AnimatePresence */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
