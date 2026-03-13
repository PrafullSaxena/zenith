/**
 * Renders a mermaid diagram syntax string to a PNG data URL.
 *
 * Creates an off-screen container, uses the mermaid library to render SVG,
 * then converts SVG to PNG via canvas. Uses the same dark theme as
 * MermaidRenderer.tsx for visual consistency.
 */

/**
 * Render mermaid syntax to a base64 PNG data URL.
 * Returns null if rendering fails.
 */
export async function renderMermaidToPng(
  syntax: string,
  width = 800
): Promise<string | null> {
  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#4f46e5',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#6366f1',
        lineColor: '#67e8f9',
        secondaryColor: '#1e1b4b',
        tertiaryColor: '#312e81',
        background: '#0f0e1a',
        mainBkg: '#1e1b4b',
        nodeBorder: '#6366f1',
        clusterBkg: '#1e1b4b',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e1b4b'
      },
      flowchart: { useMaxWidth: true, curve: 'basis' },
      er: { useMaxWidth: true }
    })

    const id = `mermaid-png-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    const { svg } = await mermaid.default.render(id, syntax.trim())

    // Convert SVG to PNG via canvas
    return await svgToPng(svg, width)
  } catch (err) {
    console.warn('[mermaid-to-png] Failed to render:', err)
    return null
  }
}

/**
 * Extract all mermaid code blocks from markdown and render them to PNG.
 * Returns a map of index → data URL for each successfully rendered diagram.
 */
export async function renderAllMermaidBlocks(
  markdown: string
): Promise<Record<number, string>> {
  const mermaidBlocks: { index: number; syntax: string }[] = []
  const regex = /```mermaid\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  let idx = 0

  while ((match = regex.exec(markdown)) !== null) {
    mermaidBlocks.push({ index: idx, syntax: match[1] })
    idx++
  }

  if (mermaidBlocks.length === 0) return {}

  const results: Record<number, string> = {}
  for (const block of mermaidBlocks) {
    const png = await renderMermaidToPng(block.syntax)
    if (png) {
      results[block.index] = png
    }
  }

  return results
}

async function svgToPng(svgString: string, targetWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      const aspectRatio = img.height / img.width
      const width = Math.min(targetWidth, img.width)
      const height = Math.round(width * aspectRatio)

      const canvas = document.createElement('canvas')
      canvas.width = width * 2 // 2x for retina
      canvas.height = height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('No canvas context'))
        return
      }

      // White background for light PDFs, dark for dark PDFs
      ctx.fillStyle = '#1a1b2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG image load failed'))
    }

    img.src = url
  })
}
