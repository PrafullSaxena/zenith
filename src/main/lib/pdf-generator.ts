/**
 * Unified PDF generation engine using pdfmake.
 *
 * Runs in the main process only — pdfmake is a Node.js-only dependency
 * and must never be imported in the renderer process.
 *
 * All plugins (TextCraft, Nebula, Launchpad, ER Diagram) compose markdown
 * and call the single `exportPdf()` function via the `app:exportPdf` IPC channel.
 *
 * Supports three visual themes controlled by the `general.pdfStyle` setting:
 *  - **Colored** (default): accent-colored headers, teal blockquote borders,
 *    tinted table headers, language labels — a modern, branded look.
 *  - **Traditional** (basic): black/gray text only, no color accents — clean
 *    and printer-friendly.
 *  - **Pretty**: dark background matching the app's dark theme with cyan accents.
 *
 * Generates a styled document from markdown text with:
 * - Headers (H1, H2, H3)
 * - Bold, italic, inline code
 * - Bullet and numbered lists (nested)
 * - Blockquotes with accent left border
 * - Horizontal rules
 * - Code blocks with background fills
 * - Tables
 * - Mermaid diagrams (pre-rendered PNGs from renderer process)
 * - Portrait and landscape orientations
 */

import { dialog, app } from 'electron'
import type { BrowserWindow } from 'electron'
import fs from 'fs'
import { getSetting } from '../settings-store'

// ── Types ──────────────────────────────────────────────────────────────────

export interface PdfExportData {
  markdown: string
  title?: string
  mermaidImages?: Record<number, string>
  orientation?: 'portrait' | 'landscape'
}

// pdfmake content node (simplified)
type PdfNode = Record<string, unknown>

// ── Color themes ────────────────────────────────────────────────────────────

interface PdfTheme {
  h1Color: string
  h2Color: string
  h3Color: string
  textColor: string
  mutedColor: string
  codeBackground: string
  codeLabelColor: string
  blockquoteBorderColor: string
  blockquoteTextColor: string
  ruleColor: string
  tableHeaderFill: string
  tableBorderColor: string
  footerColor: string
}

const COLORED_THEME: PdfTheme = {
  h1Color: '#0d9488',       // teal-600
  h2Color: '#115e59',       // teal-800
  h3Color: '#1a1a1a',
  textColor: '#333333',
  mutedColor: '#888888',
  codeBackground: '#f0fdf4',
  codeLabelColor: '#0d9488',
  blockquoteBorderColor: '#4fd1c5',
  blockquoteTextColor: '#555555',
  ruleColor: '#d1d5db',
  tableHeaderFill: '#f0fdfa',
  tableBorderColor: '#ccfbf1',
  footerColor: '#94a3b8'
}

const BASIC_THEME: PdfTheme = {
  h1Color: '#111111',
  h2Color: '#222222',
  h3Color: '#333333',
  textColor: '#333333',
  mutedColor: '#888888',
  codeBackground: '#f5f5f5',
  codeLabelColor: '#888888',
  blockquoteBorderColor: '#999999',
  blockquoteTextColor: '#666666',
  ruleColor: '#dddddd',
  tableHeaderFill: '#f5f5f5',
  tableBorderColor: '#dddddd',
  footerColor: '#aaaaaa'
}

const PRETTY_THEME: PdfTheme = {
  h1Color: '#67e8f9',       // cyan-300
  h2Color: '#22d3ee',       // cyan-400
  h3Color: '#a5f3fc',       // cyan-200
  textColor: '#e2e8f0',     // slate-200
  mutedColor: '#94a3b8',    // slate-400
  codeBackground: '#0f172a', // slate-900
  codeLabelColor: '#67e8f9',
  blockquoteBorderColor: '#22d3ee',
  blockquoteTextColor: '#cbd5e1', // slate-300
  ruleColor: '#334155',     // slate-700
  tableHeaderFill: '#1e293b', // slate-800
  tableBorderColor: '#334155',
  footerColor: '#64748b'    // slate-500
}

// ── Inline markdown parser → pdfmake text array ────────────────────────────

function parseInline(text: string, theme: PdfTheme): PdfNode[] | string {
  const parts: PdfNode[] = []
  // Match: **bold**, *italic*, `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) })
    }
    if (match[2]) {
      parts.push({ text: match[2], bold: true })
    } else if (match[3]) {
      parts.push({ text: match[3], italics: true })
    } else if (match[4]) {
      parts.push({ text: match[4], font: 'Courier', fontSize: 9, background: theme.codeBackground })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) })
  }

  if (parts.length === 0) return text
  if (parts.length === 1 && typeof parts[0].text === 'string' && Object.keys(parts[0]).length === 1) {
    return parts[0].text as string
  }
  return parts
}

// ── Nested list parser ──────────────────────────────────────────────────────

interface ListTreeItem {
  text: string
  ordered: boolean
  children: ListTreeItem[]
}

/**
 * Get the indentation level (number of leading spaces) of a line.
 */
function getIndent(line: string): number {
  return line.length - line.trimStart().length
}

/**
 * Parse indented markdown list lines into a tree, then convert to a pdfmake
 * nested list node. Handles mixed ordered/unordered and arbitrary depth.
 */
function parseNestedList(lines: string[], theme: PdfTheme): PdfNode {
  const nonEmpty = lines.filter((l: string) => l.trim())
  if (nonEmpty.length === 0) return { text: '' }

  function parseItems(items: string[], baseIndent: number): ListTreeItem[] {
    const result: ListTreeItem[] = []
    let i = 0

    while (i < items.length) {
      const line = items[i]
      if (!line.trim()) {
        i++
        continue
      }

      const indent = getIndent(line)

      // Skip lines with less indent than expected (shouldn't happen at this level)
      if (indent < baseIndent) break

      if (indent === baseIndent) {
        const trimmed = line.trim()
        const isOrd = /^\d+[.)]\s/.test(trimmed)
        const text = trimmed.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '')
        result.push({ text, ordered: isOrd, children: [] })
        i++

        // Collect child lines (greater indent)
        const childLines: string[] = []
        while (i < items.length) {
          const nextLine = items[i]
          if (!nextLine.trim()) {
            i++
            continue
          }
          if (getIndent(nextLine) > baseIndent) {
            childLines.push(nextLine)
            i++
          } else {
            break
          }
        }

        if (childLines.length > 0) {
          const childIndent = getIndent(childLines.find((l: string) => l.trim()) || '')
          result[result.length - 1].children = parseItems(childLines, childIndent)
        }
      } else {
        // Unexpected deeper indent without a parent — treat as base
        i++
      }
    }

    return result
  }

  const baseIndent = getIndent(nonEmpty[0])
  const tree = parseItems(nonEmpty, baseIndent)

  function treeToNode(items: ListTreeItem[]): PdfNode {
    const isOrd = items[0]?.ordered ?? false
    const key = isOrd ? 'ol' : 'ul'
    return {
      [key]: items.map((item) => {
        const textNode = {
          text: parseInline(item.text, theme),
          fontSize: 10,
          lineHeight: 1.5,
          margin: [0, 2, 0, 2]
        }
        if (item.children.length === 0) return textNode
        return [textNode, treeToNode(item.children)]
      }),
      margin: [0, 4, 0, 4]
    }
  }

  return treeToNode(tree)
}

// ── Block-level markdown → pdfmake content ──────────────────────────────────

function markdownToPdfContent(
  md: string,
  theme: PdfTheme,
  mermaidImages?: Record<number, string>
): PdfNode[] {
  const content: PdfNode[] = []
  let mermaidIndex = 0

  // Split by code fences first
  const blocks = md.split(/(```[\s\S]*?```)/g)

  for (const block of blocks) {
    if (block.startsWith('```') && block.endsWith('```')) {
      // Code fence block
      const inner = block.slice(3, -3)
      const nlIdx = inner.indexOf('\n')
      const lang = nlIdx >= 0 ? inner.slice(0, nlIdx).trim().toLowerCase() : ''
      const code = nlIdx >= 0 ? inner.slice(nlIdx + 1).trim() : inner.trim()

      // Mermaid diagrams — embed pre-rendered PNG if available, otherwise placeholder
      if (lang === 'mermaid') {
        const imageData = mermaidImages?.[mermaidIndex]
        mermaidIndex++
        if (imageData) {
          content.push({
            image: imageData,
            width: 515,  // Full content width (page width minus margins)
            alignment: 'center' as const,
            margin: [0, 8, 0, 8]
          })
        } else {
          content.push({
            text: '[Mermaid Diagram — view in app]',
            italics: true,
            fontSize: 9,
            color: theme.mutedColor,
            margin: [0, 6, 0, 6]
          })
        }
        continue
      }

      // Language label
      if (lang) {
        content.push({
          text: lang.toUpperCase(),
          fontSize: 7,
          color: theme.codeLabelColor,
          margin: [0, 8, 0, 2]
        })
      }

      // Code block
      content.push({
        text: code,
        font: 'Courier',
        fontSize: 8.5,
        lineHeight: 1.4,
        background: theme.codeBackground,
        margin: [0, 0, 0, 8],
        preserveLeadingSpaces: true
      })
      continue
    }

    // Non-code text — split into paragraphs
    const paragraphs = block.split(/\n{2,}/)

    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (!trimmed) continue

      // Horizontal rule
      if (/^[-*_]{3,}\s*$/.test(trimmed)) {
        content.push({
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: theme.ruleColor }],
          margin: [0, 10, 0, 10]
        })
        continue
      }

      // Blockquote (all lines start with >)
      const bqLines = trimmed.split('\n')
      const isBlockquote = bqLines.every((l: string) => /^>\s?/.test(l.trim()) || !l.trim())
      if (isBlockquote && bqLines.some((l: string) => /^>\s?/.test(l.trim()))) {
        const bqText = bqLines.map((l: string) => l.trim().replace(/^>\s?/, '')).join(' ')
        content.push({
          columns: [
            { width: 3, canvas: [{ type: 'rect', x: 0, y: 0, w: 3, h: 40, color: theme.blockquoteBorderColor }] },
            {
              width: '*',
              text: parseInline(bqText, theme),
              italics: true,
              fontSize: 10,
              color: theme.blockquoteTextColor,
              margin: [8, 0, 0, 0],
              lineHeight: 1.5
            }
          ],
          margin: [0, 6, 0, 6]
        })
        continue
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        content.push({
          text: parseInline(trimmed.slice(2), theme),
          fontSize: 20,
          bold: true,
          color: theme.h1Color,
          margin: [0, 12, 0, 6]
        })
        continue
      }
      if (trimmed.startsWith('## ')) {
        content.push({
          text: parseInline(trimmed.slice(3), theme),
          fontSize: 15,
          bold: true,
          color: theme.h2Color,
          margin: [0, 14, 0, 4]
        })
        continue
      }
      if (trimmed.startsWith('### ')) {
        content.push({
          text: parseInline(trimmed.slice(4), theme),
          fontSize: 12,
          bold: true,
          color: theme.h3Color,
          margin: [0, 10, 0, 3]
        })
        continue
      }

      // Lists (supports nested indented items and continuation lines)
      const lines = trimmed.split('\n')
      const firstNonEmpty = lines.find((l: string) => l.trim())
      const isBulletList = firstNonEmpty && /^[-*•]\s/.test(firstNonEmpty.trim())
      const isNumberedList = firstNonEmpty && /^\d+[.)]\s/.test(firstNonEmpty.trim())
      const isListBlock =
        (isBulletList || isNumberedList) &&
        lines.every((l: string) => {
          const t = l.trim()
          if (!t) return true // empty line
          if (/^[-*•]\s/.test(t) || /^\d+[.)]\s/.test(t)) return true // list marker
          // Allow indented continuation lines (part of a list item)
          if (getIndent(l) > 0) return true
          return false
        })

      if (isListBlock) {
        content.push(parseNestedList(lines, theme))
        continue
      }

      // Table
      const isTable =
        lines.length >= 2 &&
        lines[0].includes('|') &&
        /^\|?\s*[-:\s|]+\s*\|?$/.test(lines[1].trim()) &&
        lines[1].includes('-')
      if (isTable) {
        const parseRow = (line: string): string[] =>
          line.trim().replace(/^\||\|$/g, '').split('|').map((c: string) => c.trim())

        const headers = parseRow(lines[0])
        const bodyRows = lines.slice(2).filter((l: string) => l.trim() && l.includes('|')).map(parseRow)

        const tableBody: PdfNode[][] = []
        // Header row
        tableBody.push(
          headers.map((h: string) => ({
            text: parseInline(h, theme),
            bold: true,
            fontSize: 9,
            fillColor: theme.tableHeaderFill,
            margin: [4, 4, 4, 4]
          }))
        )
        // Data rows
        for (const row of bodyRows) {
          tableBody.push(
            headers.map((_: string, ci: number) => ({
              text: parseInline(row[ci] ?? '', theme),
              fontSize: 9,
              margin: [4, 3, 4, 3]
            }))
          )
        }

        content.push({
          table: {
            headerRows: 1,
            widths: headers.map(() => '*'),
            body: tableBody
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => theme.tableBorderColor,
            vLineColor: () => theme.tableBorderColor,
            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 3,
            paddingBottom: () => 3
          },
          margin: [0, 6, 0, 6]
        })
        continue
      }

      // Regular paragraph
      content.push({
        text: parseInline(trimmed, theme),
        fontSize: 10,
        lineHeight: 1.6,
        color: theme.textColor,
        margin: [0, 3, 0, 3]
      })
    }
  }

  return content
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF from markdown text and save it to disk via a save dialog.
 *
 * Reads `general.pdfStyle` setting to determine visual theme.
 *
 * @param win - The parent browser window (for modal dialog positioning)
 * @param data - The markdown text, optional title, mermaid images, and orientation
 * @returns The file path written to, or null if the user cancelled
 */
export async function exportPdf(
  win: BrowserWindow,
  data: PdfExportData
): Promise<string | null> {
  // Resolve theme from settings
  const pdfStyle = getSetting('general.pdfStyle') as string | undefined
  const theme =
    pdfStyle === 'pretty' ? PRETTY_THEME : pdfStyle === 'traditional' ? BASIC_THEME : COLORED_THEME

  // Use working directory if set, otherwise downloads
  const workingDir = getSetting('general.workingDirectory') as string
  const defaultDir = workingDir || app.getPath('downloads')

  // Extract title from first heading or use provided title
  const titleMatch = data.markdown.match(/^#\s+(.+)$/m)
  const title = data.title || (titleMatch ? titleMatch[1].replace(/\*\*/g, '') : 'TextCraft Export')
  const slug = title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase()
  const timestamp = new Date().toISOString().split('T')[0]

  const { filePath, canceled } = await dialog.showSaveDialog(win, {
    title: 'Export as PDF',
    defaultPath: `${defaultDir}/${slug}-${timestamp}.pdf`,
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }]
  })

  if (canceled || !filePath) return null

  // Build PDF content from markdown
  const content = markdownToPdfContent(data.markdown, theme, data.mermaidImages)

  // Add generation footer
  content.push({
    text: `Generated by Zenith · ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    fontSize: 7,
    color: theme.footerColor,
    margin: [0, 20, 0, 0],
    alignment: 'right'
  })

  // Lazy-load pdfmake and configure fonts inside the function to avoid
  // module-level side effects that could interfere with handler registration.
  const pdfmake = await import('pdfmake')
  pdfmake.default.fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    },
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique'
    }
  }

  const isPretty = pdfStyle === 'pretty'
  const isLandscape = data.orientation === 'landscape'
  const pageW = isLandscape ? 841.89 : 595.28
  const pageH = isLandscape ? 595.28 : 841.89
  const docDefinition = {
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: theme.textColor },
    content,
    pageMargins: [40, 40, 40, 40],
    pageOrientation: data.orientation || 'portrait',
    ...(isPretty
      ? {
          background: () => ({
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: pageW,
                h: pageH,
                color: '#1a1b2e'
              }
            ]
          })
        }
      : {})
  }

  const pdf = pdfmake.default.createPdf(docDefinition as Parameters<typeof pdfmake.default.createPdf>[0])
  const buffer = await pdf.getBuffer()
  fs.writeFileSync(filePath, buffer)

  return filePath
}
