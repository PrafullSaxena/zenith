/**
 * useGlobalKeyboardShortcuts -- Central handler for global keyboard shortcuts
 * not already handled by other components.
 *
 * Already handled elsewhere:
 *  - Cmd+K: CommandPaletteProvider
 *  - Cmd+B: Sidebar
 *  - Escape: Dialog/CommandPalette onOpenChange
 *
 * This hook adds:
 *  - Cmd+N: Navigate to Nebula (new note context)
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useGlobalKeyboardShortcuts(): void {
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Cmd+N / Ctrl+N: New note (navigate to Nebula)
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        // Don't hijack if user is typing in an input
        const tag = (document.activeElement as HTMLElement)?.tagName
        const isEditable = (document.activeElement as HTMLElement)?.getAttribute('contenteditable')
        if (tag === 'INPUT' || tag === 'TEXTAREA' || isEditable === 'true') {
          return
        }
        e.preventDefault()
        navigate('/nebula')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate])
}
