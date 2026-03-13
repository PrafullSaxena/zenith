/**
 * PDF generation for the Launchpad plugin using pdfmake.
 *
 * Runs in the main process only — pdfmake is a Node.js-only dependency
 * and must never be imported in the renderer process.
 *
 * Generates a cloud cost estimation report with a service table,
 * totals, and optional AI recommendations.
 */

import { dialog, app } from 'electron'
import type { BrowserWindow } from 'electron'
import fs from 'fs'
import { getSetting } from '../settings-store'

// ── Local type (decoupled from renderer types) ───────────────────────────────

interface EstimationExport {
  name: string
  provider: string
  lineItems: Array<{
    serviceName: string
    configSummary: string
    monthly: number
    yearly: number
  }>
  totalMonthly: number
  totalYearly: number
  aiRecommendations?: string
}

// ── Helper: format currency ──────────────────────────────────────────────────

function fmt(value: number): string {
  return `$${value.toFixed(2)}`
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a cloud cost estimation PDF and save it to disk via a save dialog.
 *
 * @param win - The parent browser window (for modal dialog positioning)
 * @param estimation - Serialized estimation data to render
 * @returns The file path written to, or null if the user cancelled
 */
export async function exportEstimationPdf(
  win: BrowserWindow,
  estimation: EstimationExport
): Promise<string | null> {
  // Resolve settings
  const pdfStyle = getSetting('general.pdfStyle') as string | undefined
  const useColor = pdfStyle !== 'traditional'
  const workingDir = getSetting('general.workingDirectory') as string
  const defaultDir = workingDir || app.getPath('downloads')

  // Show save dialog
  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Save Cost Estimation Report',
    defaultPath: `${defaultDir}/${estimation.name.replace(/\s+/g, '-')}-estimate.pdf`,
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  })

  if (canceled || !filePath) {
    return null
  }

  // Theme-aware colors
  const headerFill = useColor ? '#0d9488' : '#1a1a1a'
  const headerText = '#ffffff'
  const totalFill = useColor ? '#f0fdfa' : '#f0f0f0'
  const titleColor = useColor ? '#0d9488' : '#111111'
  const subtitleColor = useColor ? '#115e59' : '#666666'
  const recTitleColor = useColor ? '#0d9488' : '#333333'

  // Build table body: header + data rows + total row
  // Using unknown[][] to satisfy pdfmake's flexible table body type
  const tableBody: unknown[][] = []

  // Header row
  tableBody.push([
    { text: 'Service', bold: true, fillColor: headerFill, color: headerText },
    { text: 'Configuration', bold: true, fillColor: headerFill, color: headerText },
    { text: 'Monthly', bold: true, fillColor: headerFill, color: headerText, alignment: 'right' },
    { text: 'Yearly', bold: true, fillColor: headerFill, color: headerText, alignment: 'right' }
  ])

  // Data rows
  for (const item of estimation.lineItems) {
    tableBody.push([
      { text: item.serviceName },
      { text: item.configSummary || '-', fontSize: 9, color: '#666666' },
      { text: fmt(item.monthly), alignment: 'right' },
      { text: fmt(item.yearly), alignment: 'right' }
    ])
  }

  // Total row (colSpan for label + empty cell)
  tableBody.push([
    { text: 'TOTAL', bold: true, colSpan: 2, fillColor: totalFill },
    {},
    { text: fmt(estimation.totalMonthly), bold: true, alignment: 'right', fillColor: totalFill },
    { text: fmt(estimation.totalYearly), bold: true, alignment: 'right', fillColor: totalFill }
  ])

  // Build the content array
  const content: unknown[] = [
    // Title
    { text: 'Cloud Cost Estimation Report', fontSize: 22, bold: true, color: titleColor, marginBottom: 4 },
    // Provider subtitle
    { text: estimation.provider.toUpperCase(), fontSize: 14, color: subtitleColor, marginBottom: 4 },
    // Date
    {
      text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      fontSize: 10,
      color: '#888888',
      marginBottom: 20
    },
    // Estimation name
    { text: estimation.name, fontSize: 13, bold: true, marginBottom: 12 },
    // Services table
    {
      table: {
        headerRows: 1,
        widths: ['*', '*', 80, 80],
        body: tableBody
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 1 ? 1.5 : 0.5),
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 8,
        paddingRight: () => 8,
        paddingTop: () => 6,
        paddingBottom: () => 6
      }
    }
  ]

  // Append AI recommendations section if present
  if (estimation.aiRecommendations) {
    content.push(
      { text: 'AI Recommendations', fontSize: 14, bold: true, color: recTitleColor, marginTop: 24, marginBottom: 8 },
      { text: estimation.aiRecommendations, fontSize: 10, color: '#444444' }
    )
  }

  // Lazy-load pdfmake and configure fonts inside the function to avoid
  // module-level side effects that could interfere with handler registration.
  const pdfmake = await import('pdfmake')
  pdfmake.default.fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
  }

  // Build document definition using unknown cast to bypass strict table body typing
  const docDefinition = {
    defaultStyle: { font: 'Helvetica', fontSize: 11 },
    content,
    pageMargins: [40, 40, 40, 40]
  }

  // Generate PDF buffer and write to disk
  const pdf = pdfmake.default.createPdf(docDefinition as Parameters<typeof pdfmake.default.createPdf>[0])
  const buffer = await pdf.getBuffer()
  fs.writeFileSync(filePath, buffer)

  return filePath
}
