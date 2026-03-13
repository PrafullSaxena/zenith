/**
 * Renders a mermaid diagram syntax string to a PNG data URL.
 *
 * Creates an off-screen container, uses the mermaid library to render SVG,
 * then converts SVG to PNG via canvas.
 *
 * Supports light and dark themes for matching PDF export styles:
 * - lightMode=false (default): dark theme matching app appearance
 * - lightMode=true: light theme for "colored" and "traditional" PDF styles
 */

/**
 * Pre-process mermaid syntax to fix common issues before rendering.
 * - Flowcharts: replace `|` inside node labels ([...], (...), {...}) with ` · `
 *   since mermaid uses `|` as a link-text delimiter.
 * - ER diagrams are left untouched (they use `|` in relationship notation).
 */
function preprocessMermaid(raw: string): string {
  const trimmed = raw.trim()

  // Only sanitize pipe characters in flowchart / graph definitions
  if (/^(flowchart|graph)\s/i.test(trimmed)) {
    let result = trimmed.replace(/\[[^\]]*\]/g, (m) => m.replace(/\|/g, ' · '))
    result = result.replace(/\([^)]*\)/g, (m) => m.replace(/\|/g, ' · '))
    result = result.replace(/\{[^}]*\}/g, (m) => m.replace(/\|/g, ' · '))
    return result
  }

  return trimmed
}

/**
 * Render mermaid syntax to a base64 PNG data URL.
 * Returns null if rendering fails.
 *
 * @param syntax - Mermaid diagram syntax
 * @param width - Target width in pixels (default: 800)
 * @param lightMode - Use light theme for light PDF backgrounds (default: false)
 */
export async function renderMermaidToPng(
  syntax: string,
  width = 800,
  lightMode = false
): Promise<string | null> {
  // Create an off-screen container for mermaid to render into.
  // Mermaid needs a DOM element to measure text dimensions.
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;'
  document.body.appendChild(container)

  try {
    const mermaid = await import('mermaid')
    mermaid.default.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: lightMode ? 'default' : 'dark',
      themeVariables: lightMode ? {
        primaryColor: '#0d9488',
        primaryTextColor: '#1a1a1a',
        primaryBorderColor: '#0d9488',
        lineColor: '#64748b',
        secondaryColor: '#f0fdfa',
        tertiaryColor: '#ccfbf1',
        background: '#ffffff',
        mainBkg: '#f0fdfa',
        nodeBorder: '#0d9488',
        clusterBkg: '#f8fafc',
        titleColor: '#1a1a1a',
        edgeLabelBackground: '#ffffff'
      } : {
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

    // Pre-process syntax to fix common issues (pipe chars in flowcharts, etc.)
    const sanitized = preprocessMermaid(syntax)

    const id = `mermaid-png-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
    const { svg } = await mermaid.default.render(id, sanitized)

    // Convert SVG to PNG via canvas
    return await svgToPng(svg, width, lightMode)
  } catch (err) {
    console.warn('[mermaid-to-png] Failed to render:', err)
    return null
  } finally {
    // Always clean up the off-screen container and any orphaned mermaid elements
    container.remove()
    cleanupMermaidErrors()
  }
}

/**
 * Extract all mermaid code blocks from markdown and render them to PNG.
 * Returns a map of index → data URL for each successfully rendered diagram.
 *
 * @param markdown - Markdown text containing mermaid code fences
 * @param lightMode - Use light theme for light PDF backgrounds (default: false)
 */
export async function renderAllMermaidBlocks(
  markdown: string,
  lightMode = false
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
    const png = await renderMermaidToPng(block.syntax, 800, lightMode)
    if (png) {
      results[block.index] = png
    }
  }

  return results
}

/** Remove orphaned mermaid error SVGs that mermaid injects into the document body. */
function cleanupMermaidErrors(): void {
  document.querySelectorAll('svg[id^="d"]').forEach((el) => {
    if (
      el.querySelector('.error-icon') ||
      el.textContent?.includes('Syntax error')
    ) {
      el.remove()
    }
  })
  document.querySelectorAll('div[id^="d"]').forEach((el) => {
    if (el.textContent?.includes('Syntax error') && el.querySelector('svg')) {
      el.remove()
    }
  })
}

async function svgToPng(svgString: string, targetWidth: number, lightMode = false): Promise<string> {
  // Ensure SVG has explicit dimensions and xmlns for standalone rendering
  let svgStr = svgString
  if (!svgStr.includes('xmlns=')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  return new Promise((resolve, reject) => {
    const img = new Image()

    // Use a data URL instead of Blob URL to avoid potential CORS/CSP issues in Electron
    const encoded = btoa(unescape(encodeURIComponent(svgStr)))
    const dataUrl = `data:image/svg+xml;base64,${encoded}`

    img.onload = () => {
      const aspectRatio = img.height / img.width
      const width = Math.min(targetWidth, img.width || targetWidth)
      const height = Math.round(width * aspectRatio) || Math.round(width * 0.6)

      const canvas = document.createElement('canvas')
      canvas.width = width * 2 // 2x for retina
      canvas.height = height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No canvas context'))
        return
      }

      // Background color matches PDF theme
      ctx.fillStyle = lightMode ? '#ffffff' : '#1a1b2e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, width, height)

      resolve(canvas.toDataURL('image/png'))
    }

    img.onerror = (e) => {
      console.warn('[mermaid-to-png] Image load failed:', e)
      reject(new Error('SVG image load failed'))
    }

    img.src = dataUrl
  })
}
