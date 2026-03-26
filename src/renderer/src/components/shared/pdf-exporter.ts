import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PdfExportOptions {
  content: string
  metadata?: {
    title?: string
    author?: string
    date?: string
    plugin?: string
  }
  format?: 'report' | 'document' | 'diagram'
}

// ---------------------------------------------------------------------------
// Export function
// ---------------------------------------------------------------------------

export async function exportPdf(options: PdfExportOptions): Promise<void> {
  try {
    const api = (window as Record<string, unknown>).api as
      | { app?: { exportPdf?: (opts: unknown) => Promise<void> } }
      | undefined

    if (!api?.app?.exportPdf) {
      toast.error('PDF export not available in this environment')
      return
    }

    await api.app.exportPdf({
      content: options.content,
      metadata: {
        title: options.metadata?.title ?? 'Zenith Export',
        author: options.metadata?.author ?? 'Zenith',
        date: options.metadata?.date ?? new Date().toISOString(),
        plugin: options.metadata?.plugin
      },
      format: options.format ?? 'document'
    })

    toast.success('PDF exported successfully')
  } catch (err) {
    toast.error(`PDF export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
