/**
 * Converts a markdown string to a Tiptap-compatible JSON document.
 *
 * Handles: headings, paragraphs, bold, italic, inline code, code blocks,
 * bullet lists, ordered lists, blockquotes, links, horizontal rules.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TiptapNode = Record<string, any>

export function markdownToTiptapJson(md: string): TiptapNode {
  const lines = md.split('\n')
  const content: TiptapNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      i++
      continue
    }

    // Code block (fenced)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      content.push({
        type: 'codeBlock',
        attrs: { language: lang || 'plaintext' },
        content: [{ type: 'text', text: codeLines.join('\n') }]
      })
      continue
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      content.push({ type: 'horizontalRule' })
      i++
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInlineMarks(headingMatch[2])
      })
      i++
      continue
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const bqLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        bqLines.push(lines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      content.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: parseInlineMarks(bqLines.join(' '))
          }
        ]
      })
      continue
    }

    // Bullet list
    if (/^[-*]\s/.test(line.trim())) {
      const items: TiptapNode[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '')
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineMarks(itemText) }]
        })
        i++
      }
      content.push({ type: 'bulletList', content: items })
      continue
    }

    // Ordered list
    if (/^\d+[.)]\s/.test(line.trim())) {
      const items: TiptapNode[] = []
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+[.)]\s+/, '')
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineMarks(itemText) }]
        })
        i++
      }
      content.push({ type: 'orderedList', content: items })
      continue
    }

    // Regular paragraph (collect consecutive non-empty, non-special lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*]\s/.test(lines[i].trim()) &&
      !/^\d+[.)]\s/.test(lines[i].trim()) &&
      !/^[-*_]{3,}\s*$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }

    if (paraLines.length > 0) {
      content.push({
        type: 'paragraph',
        content: parseInlineMarks(paraLines.join(' '))
      })
    }
  }

  return { type: 'doc', content }
}

/** Parse inline markdown marks into Tiptap text nodes with marks. */
function parseInlineMarks(text: string): TiptapNode[] {
  const nodes: TiptapNode[] = []
  // Match: **bold**, *italic*, `code`, [text](url)
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[2]) {
      // Bold
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }] })
    } else if (match[3]) {
      // Italic
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'italic' }] })
    } else if (match[4]) {
      // Inline code
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'code' }] })
    } else if (match[5] && match[6]) {
      // Link
      nodes.push({
        type: 'text',
        text: match[5],
        marks: [{ type: 'link', attrs: { href: match[6], target: '_blank' } }]
      })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.length > 0 ? nodes : [{ type: 'text', text: text || ' ' }]
}
