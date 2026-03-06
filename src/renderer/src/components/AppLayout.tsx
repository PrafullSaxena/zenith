import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar — fixed 56px width, never collapses */}
      <Sidebar />

      {/* Content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Drag region for custom titlebar — transparent, just for dragging */}
        <div className="drag-region h-8 w-full flex-shrink-0" />

        {/* Main content — scrollable */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
