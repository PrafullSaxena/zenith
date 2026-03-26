/**
 * CodeViewer — CodeMirror 6 read-only code viewer.
 * Destroys and recreates the editor on file switch (PITFALLS.md: no display:none).
 * Dynamic language extension imports for syntax highlighting.
 */
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { FileCode } from 'lucide-react'
import { useCortexStore } from '../../../stores/cortex-store'
import type { Extension } from '@codemirror/state'

// ── Language extension loader ───────────────────────────────────────

async function getLanguageExtension(lang: string): Promise<Extension> {
  switch (lang) {
    case 'typescript':
    case 'tsx': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ typescript: true, jsx: lang === 'tsx' })
    }
    case 'javascript':
    case 'jsx': {
      const { javascript } = await import('@codemirror/lang-javascript')
      return javascript({ jsx: lang === 'jsx' })
    }
    case 'java': {
      const { java } = await import('@codemirror/lang-java')
      return java()
    }
    case 'python': {
      const { python } = await import('@codemirror/lang-python')
      return python()
    }
    case 'json': {
      const { json } = await import('@codemirror/lang-json')
      return json()
    }
    case 'sql': {
      const { sql } = await import('@codemirror/lang-sql')
      return sql()
    }
    case 'css':
    case 'scss': {
      const { css } = await import('@codemirror/lang-css')
      return css()
    }
    case 'html': {
      const { html } = await import('@codemirror/lang-html')
      return html()
    }
    case 'markdown': {
      const { markdown } = await import('@codemirror/lang-markdown')
      return markdown()
    }
    default:
      return []
  }
}

// ── CodeViewer component ────────────────────────────────────────────

export default function CodeViewer(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const fileContent = useCortexStore((s) => s.fileContent)
  const activeFilePath = useCortexStore((s) => s.activeFilePath)
  const openFiles = useCortexStore((s) => s.openFiles)
  const scrollToLine = useCortexStore((s) => s.scrollToLine)
  const setScrollToLine = useCortexStore((s) => s.setScrollToLine)

  // Get language from openFiles list for the active file
  const activeFileEntry = openFiles.find((f) => f.path === activeFilePath)
  const language = fileContent?.language ?? activeFileEntry?.language ?? 'plaintext'

  useEffect(() => {
    if (!containerRef.current || !fileContent) return

    // Destroy any existing editor
    if (viewRef.current) {
      viewRef.current.destroy()
      viewRef.current = null
    }

    let cancelled = false

    async function createEditor(): Promise<void> {
      const langExt = await getLanguageExtension(language)
      if (cancelled || !containerRef.current) return

      const state = EditorState.create({
        doc: fileContent!.content,
        extensions: [
          basicSetup,
          oneDark,
          langExt,
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.theme({
            '&': { height: '100%' },
            '.cm-scroller': { overflow: 'auto' }
          })
        ]
      })

      viewRef.current = new EditorView({
        state,
        parent: containerRef.current!
      })
    }

    createEditor()

    return () => {
      cancelled = true
    }
  }, [fileContent, language])

  // Scroll to line when requested
  useEffect(() => {
    if (scrollToLine && viewRef.current) {
      const view = viewRef.current
      const lineNum = Math.min(scrollToLine, view.state.doc.lines)
      const line = view.state.doc.line(lineNum)
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' })
      })
      setScrollToLine(null)
    }
  }, [scrollToLine, setScrollToLine])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [])

  // No file selected — placeholder
  if (!fileContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <FileCode size={32} className="opacity-30" />
        <p className="text-sm">Select a file to view</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor area */}
      <div ref={containerRef} className="flex-1 overflow-hidden" />

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-border bg-card px-4 py-1 text-[10px] text-muted-foreground">
        <span>{fileContent.lineCount} lines</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium uppercase">
          {language}
        </span>
      </div>
    </div>
  )
}
