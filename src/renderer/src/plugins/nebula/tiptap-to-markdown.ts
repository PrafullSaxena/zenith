/**
 * Converts a Tiptap JSON document to markdown string.
 *
 * Recursively walks the Tiptap/ProseMirror JSON tree and produces
 * standard markdown output. Supports headings, paragraphs, bold, italic,
 * code, codeBlock, bulletList, orderedList, blockquote, links, images,
 * tables, and horizontal rules.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapNode = Record<string, any>

/**
 * Convert a Tiptap JSON document to markdown.
 */
export function tiptapToMarkdown(doc: TiptapNode): string {
  if (!doc || !doc.content) return ''
  return doc.content.map((node: TiptapNode) => blockToMarkdown(node)).join('\n\n')
}

/**
 * Convert a Tiptap JSON document to clean plain text (no markdown syntax).
 * Preserves indentation, code blocks with backticks, and list structure.
 */
export function tiptapToPlainText(doc: TiptapNode): string {
  if (!doc || !doc.content) return ''
  return doc.content.map((node: TiptapNode) => blockToPlainText(node)).join('\n\n')
}

// ── Markdown conversion ──────────────────────────────────────────────

function blockToMarkdown(node: TiptapNode): string {
  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level ?? 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${inlineToMarkdown(node.content)}`
    }

    case 'paragraph':
      return inlineToMarkdown(node.content)

    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.map((c: TiptapNode) => c.text || '').join('') ?? ''
      return '```' + lang + '\n' + code + '\n```'
    }

    case 'blockquote': {
      const inner = node.content?.map((c: TiptapNode) => blockToMarkdown(c)).join('\n') ?? ''
      return inner.split('\n').map((l: string) => `> ${l}`).join('\n')
    }

    case 'bulletList':
      return (node.content ?? [])
        .map((li: TiptapNode) => {
          const text = li.content?.map((c: TiptapNode) => blockToMarkdown(c)).join('\n') ?? ''
          const lines = text.split('\n')
          return lines.map((l: string, i: number) => (i === 0 ? `- ${l}` : `  ${l}`)).join('\n')
        })
        .join('\n')

    case 'orderedList':
      return (node.content ?? [])
        .map((li: TiptapNode, idx: number) => {
          const text = li.content?.map((c: TiptapNode) => blockToMarkdown(c)).join('\n') ?? ''
          const lines = text.split('\n')
          return lines
            .map((l: string, i: number) => (i === 0 ? `${idx + 1}. ${l}` : `   ${l}`))
            .join('\n')
        })
        .join('\n')

    case 'horizontalRule':
      return '---'

    case 'image': {
      const alt = node.attrs?.alt ?? ''
      const src = node.attrs?.src ?? ''
      return `![${alt}](${src})`
    }

    case 'table':
      return tableToMarkdown(node)

    case 'hardBreak':
      return '  \n'

    default:
      // Unknown block — try to extract text
      if (node.content) {
        return node.content.map((c: TiptapNode) => blockToMarkdown(c)).join('\n')
      }
      return node.text ?? ''
  }
}

function inlineToMarkdown(content: TiptapNode[] | undefined): string {
  if (!content) return ''
  return content
    .map((node: TiptapNode) => {
      if (node.type === 'hardBreak') return '  \n'
      if (node.type === 'image') {
        return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`
      }

      let text = node.text ?? ''
      if (!text && node.content) {
        text = inlineToMarkdown(node.content)
      }
      if (!text) return ''

      const marks = node.marks ?? []
      for (const mark of marks) {
        switch (mark.type) {
          case 'bold':
          case 'strong':
            text = `**${text}**`
            break
          case 'italic':
          case 'em':
            text = `*${text}*`
            break
          case 'strike':
            text = `~~${text}~~`
            break
          case 'code':
            text = '`' + text + '`'
            break
          case 'link':
            text = `[${text}](${mark.attrs?.href ?? ''})`
            break
        }
      }
      return text
    })
    .join('')
}

function tableToMarkdown(table: TiptapNode): string {
  const rows: string[][] = []
  for (const row of table.content ?? []) {
    const cells: string[] = []
    for (const cell of row.content ?? []) {
      const text = cell.content?.map((c: TiptapNode) => inlineToMarkdown(c.content)).join(' ') ?? ''
      cells.push(text)
    }
    rows.push(cells)
  }

  if (rows.length === 0) return ''

  const colCount = Math.max(...rows.map((r) => r.length))
  const colWidths = Array.from({ length: colCount }, (_, ci) =>
    Math.max(3, ...rows.map((r) => (r[ci] ?? '').length))
  )

  const pad = (s: string, w: number): string => s + ' '.repeat(Math.max(0, w - s.length))
  const lines: string[] = []

  // Header row
  const header = rows[0] ?? []
  lines.push('| ' + header.map((c, i) => pad(c, colWidths[i])).join(' | ') + ' |')
  lines.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |')

  // Data rows
  for (let r = 1; r < rows.length; r++) {
    lines.push('| ' + rows[r].map((c, i) => pad(c, colWidths[i])).join(' | ') + ' |')
  }

  return lines.join('\n')
}

// ── Plain text conversion ────────────────────────────────────────────

function blockToPlainText(node: TiptapNode): string {
  switch (node.type) {
    case 'heading':
    case 'paragraph':
      return inlineToPlainText(node.content)

    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = node.content?.map((c: TiptapNode) => c.text || '').join('') ?? ''
      return '```' + lang + '\n' + code + '\n```'
    }

    case 'blockquote': {
      const inner = node.content?.map((c: TiptapNode) => blockToPlainText(c)).join('\n') ?? ''
      return inner
    }

    case 'bulletList':
      return (node.content ?? [])
        .map((li: TiptapNode) => {
          const text = li.content?.map((c: TiptapNode) => blockToPlainText(c)).join('\n') ?? ''
          const lines = text.split('\n')
          return lines.map((l: string, i: number) => (i === 0 ? `  - ${l}` : `    ${l}`)).join('\n')
        })
        .join('\n')

    case 'orderedList':
      return (node.content ?? [])
        .map((li: TiptapNode, idx: number) => {
          const text = li.content?.map((c: TiptapNode) => blockToPlainText(c)).join('\n') ?? ''
          const lines = text.split('\n')
          return lines
            .map((l: string, i: number) => (i === 0 ? `  ${idx + 1}. ${l}` : `     ${l}`))
            .join('\n')
        })
        .join('\n')

    case 'horizontalRule':
      return ''

    case 'image':
      return node.attrs?.alt ?? ''

    case 'table':
      return tableToPlainText(node)

    case 'hardBreak':
      return '\n'

    default:
      if (node.content) {
        return node.content.map((c: TiptapNode) => blockToPlainText(c)).join('\n')
      }
      return node.text ?? ''
  }
}

function inlineToPlainText(content: TiptapNode[] | undefined): string {
  if (!content) return ''
  return content
    .map((node: TiptapNode) => {
      if (node.type === 'hardBreak') return '\n'
      if (node.type === 'image') return node.attrs?.alt ?? ''
      let text = node.text ?? ''
      if (!text && node.content) {
        text = inlineToPlainText(node.content)
      }
      return text
    })
    .join('')
}

function tableToPlainText(table: TiptapNode): string {
  const rows: string[][] = []
  for (const row of table.content ?? []) {
    const cells: string[] = []
    for (const cell of row.content ?? []) {
      const text = cell.content?.map((c: TiptapNode) => inlineToPlainText(c.content)).join(' ') ?? ''
      cells.push(text)
    }
    rows.push(cells)
  }
  return rows.map((r) => r.join('\t')).join('\n')
}
