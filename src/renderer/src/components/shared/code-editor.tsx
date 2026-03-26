import { useRef, useEffect, useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { EditorView, keymap, placeholder as cmPlaceholder, lineNumbers } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { sql, PostgreSQL, MySQL } from '@codemirror/lang-sql'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { java } from '@codemirror/lang-java'
import { json } from '@codemirror/lang-json'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { markdown } from '@codemirror/lang-markdown'
import type { Extension } from '@codemirror/state'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { useCodeMirrorTheme } from '@renderer/hooks/useCodeMirrorTheme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: 'sql' | 'typescript' | 'javascript' | 'python' | 'java' | 'json' | 'css' | 'html' | 'markdown' | 'yaml'
  readOnly?: boolean
  dialect?: 'postgresql' | 'mysql'
  schemaCompletions?: { tables: string[]; columns: Record<string, string[]> }
  lineHighlight?: number[]
  onExecute?: (selection?: string) => void
  placeholder?: string
  maxHeight?: string
  showLineNumbers?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLanguageExtension(
  language: CodeEditorProps['language'],
  dialect?: CodeEditorProps['dialect'],
  schemaCompletions?: CodeEditorProps['schemaCompletions']
): Extension {
  switch (language) {
    case 'sql': {
      const dialectObj = dialect === 'mysql' ? MySQL : PostgreSQL
      const schema = schemaCompletions?.columns ?? {}
      return sql({ dialect: dialectObj, schema })
    }
    case 'typescript':
      return javascript({ typescript: true })
    case 'javascript':
      return javascript()
    case 'python':
      return python()
    case 'java':
      return java()
    case 'json':
      return json()
    case 'css':
      return css()
    case 'html':
      return html()
    case 'markdown':
      return markdown()
    case 'yaml':
      // Use markdown as fallback for yaml
      return markdown()
    default:
      return []
  }
}

// Theme is now provided by useCodeMirrorTheme() hook — syncs with settings

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  dialect,
  schemaCompletions,
  onExecute,
  placeholder: placeholderText,
  maxHeight,
  showLineNumbers = true,
  className
}: CodeEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView>()
  const langCompartment = useRef(new Compartment())
  const readOnlyCompartment = useRef(new Compartment())
  const [copied, setCopied] = useState(false)
  const { compartment: themeCompartment, theme: cmTheme, hljsTheme } = useCodeMirrorTheme()

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [value])

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const extensions: Extension[] = [
      themeCompartment.of(cmTheme),
      history(),
      langCompartment.current.of(getLanguageExtension(language, dialect, schemaCompletions)),
      readOnlyCompartment.current.of([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly)
      ]),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.lineWrapping
    ]

    if (showLineNumbers) {
      extensions.push(lineNumbers())
    }

    if (placeholderText) {
      extensions.push(cmPlaceholder(placeholderText))
    }

    if (onChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        })
      )
    }

    if (onExecute) {
      extensions.push(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: (view) => {
              const selection = view.state.sliceDoc(
                view.state.selection.main.from,
                view.state.selection.main.to
              )
              onExecute(selection || undefined)
              return true
            }
          }
        ])
      )
    }

    const state = EditorState.create({
      doc: value,
      extensions
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    viewRef.current = view

    return () => {
      view.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount only

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const currentDoc = view.state.doc.toString()
    if (currentDoc !== value) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value }
      })
    }
  }, [value])

  // Sync language changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: langCompartment.current.reconfigure(
        getLanguageExtension(language, dialect, schemaCompletions)
      )
    })
  }, [language, dialect, schemaCompletions])

  // Sync readOnly changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure([
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly)
      ])
    })
  }, [readOnly])

  // Reactively update CodeMirror theme when the setting changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: themeCompartment.reconfigure(cmTheme)
    })
  }, [hljsTheme, cmTheme, themeCompartment])

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border overflow-hidden',
        className
      )}
      style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
    >
      {/* Copy button for readOnly mode */}
      {readOnly && (
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>
      )}
      <div ref={containerRef} className="[&_.cm-editor]:outline-none" />
    </div>
  )
}
