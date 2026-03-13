/**
 * SqlEditor — CodeMirror 6 wrapper for SQL editing.
 *
 * Features:
 *  - PostgreSQL / MySQL dialect with syntax highlighting
 *  - Schema-aware autocomplete (Compartment-based live update)
 *  - Mod-Enter: run selected text if any, else run statement at cursor
 *  - Mod-Shift-Enter: run all statements
 *  - SQL format on paste via sql-formatter
 *  - Error line decoration (red background)
 *  - insertAtCursor helper via onEditorReady callback
 *  - Dark theme matching app oklch color tokens
 */

import React, { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { sql, PostgreSQL, MySQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'codemirror'
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state'
import { format as sqlFormat } from 'sql-formatter'

// ── Props ────────────────────────────────────────────────────────────

export interface SqlEditorProps {
  value: string
  onChange: (sql: string) => void
  /** Called with the SQL to execute: either selected text or the statement at cursor. */
  onExecuteCurrent: (sql: string) => void
  onExecuteAll: () => void
  /** Schema map: { tableName: columnName[] } — drives CodeMirror autocomplete. */
  schema: Record<string, string[]>
  dialect: 'postgresql' | 'mysql'
  readOnly?: boolean
  /** 1-based line number to highlight red. Null to clear. */
  errorLine?: number | null
  /** Callback fired once with the EditorView on mount — use it to call insertAtCursor. */
  onEditorReady?: (view: EditorView) => void
}

// ── Error line decoration ────────────────────────────────────────────

const setErrorLine = StateEffect.define<number | null>()

const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    decos = decos.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(setErrorLine)) {
        if (effect.value === null) {
          decos = Decoration.none
        } else {
          try {
            const line = tr.state.doc.line(effect.value)
            const builder = new RangeSetBuilder<Decoration>()
            builder.add(
              line.from,
              line.from,
              Decoration.line({ class: 'cm-error-line' })
            )
            decos = builder.finish()
          } catch {
            decos = Decoration.none
          }
        }
      }
    }
    return decos
  },
  provide: (f) => EditorView.decorations.from(f)
})

// ── Statement detection ──────────────────────────────────────────────

/**
 * Find the semicolon-delimited SQL statement that contains the cursor position.
 * Handles simple single-quoted string literals so semicolons inside strings are
 * not treated as statement separators.
 */
function getStatementAtCursor(
  state: EditorState
): { from: number; to: number; sql: string } {
  const doc = state.doc.toString()
  const cursorPos = state.selection.main.head

  // Split on semicolons outside single-quoted strings
  const boundaries: number[] = [-1]
  let inString = false
  for (let i = 0; i < doc.length; i++) {
    const ch = doc[i]
    if (ch === "'" && !inString) {
      inString = true
    } else if (ch === "'" && inString) {
      // Handle escaped single quote ''
      if (doc[i + 1] === "'") {
        i++ // skip next quote
      } else {
        inString = false
      }
    } else if (ch === ';' && !inString) {
      boundaries.push(i)
    }
  }
  boundaries.push(doc.length)

  for (let i = 0; i < boundaries.length - 1; i++) {
    const from = boundaries[i] + 1
    const to = boundaries[i + 1]
    if (cursorPos >= from && cursorPos <= to) {
      const sqlText = doc.slice(from, to).trim()
      return { from, to, sql: sqlText }
    }
  }

  return { from: 0, to: doc.length, sql: doc.trim() }
}

// ── Dialect helper ────────────────────────────────────────────────────

function getSqlDialect(dialect: 'postgresql' | 'mysql') {
  return dialect === 'mysql' ? MySQL : PostgreSQL
}

function getFormatterDialect(dialect: 'postgresql' | 'mysql'): 'postgresql' | 'mysql' {
  return dialect === 'mysql' ? 'mysql' : 'postgresql'
}

// ── App theme override ────────────────────────────────────────────────

const appTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    height: '100%',
    fontSize: '13px'
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    overflow: 'auto'
  },
  '.cm-gutters': {
    backgroundColor: 'var(--color-background)',
    borderRight: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent'
  },
  '.cm-error-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.2)'
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)'
  }
})

// ── Component ────────────────────────────────────────────────────────

const SqlEditor = React.memo(function SqlEditor({
  value,
  onChange,
  onExecuteCurrent,
  onExecuteAll,
  schema,
  dialect,
  readOnly = false,
  errorLine,
  onEditorReady
}: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const sqlCompartmentRef = useRef(new Compartment())
  const readOnlyCompartmentRef = useRef(new Compartment())

  // Keep callbacks in refs to avoid recreating the editor on every render
  const onChangeRef = useRef(onChange)
  const onExecuteCurrentRef = useRef(onExecuteCurrent)
  const onExecuteAllRef = useRef(onExecuteAll)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onExecuteCurrentRef.current = onExecuteCurrent }, [onExecuteCurrent])
  useEffect(() => { onExecuteAllRef.current = onExecuteAll }, [onExecuteAll])

  // ── Mount: create EditorView once ─────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const sqlCompartment = sqlCompartmentRef.current
    const readOnlyCompartment = readOnlyCompartmentRef.current

    const executionKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: (view) => {
          const state = view.state
          if (!state.selection.main.empty) {
            // Run selection
            const selectedSql = state.sliceDoc(
              state.selection.main.from,
              state.selection.main.to
            )
            onExecuteCurrentRef.current(selectedSql.trim())
          } else {
            // Run statement at cursor
            const { sql: stmtSql } = getStatementAtCursor(state)
            if (stmtSql) onExecuteCurrentRef.current(stmtSql)
          }
          return true
        }
      },
      {
        key: 'Mod-Shift-Enter',
        run: () => {
          onExecuteAllRef.current()
          return true
        }
      }
    ])

    const pasteHandler = EditorView.domEventHandlers({
      paste: (event, view) => {
        const text = event.clipboardData?.getData('text/plain')
        if (!text) return false
        try {
          const formatted = sqlFormat(text, {
            language: getFormatterDialect(dialect),
            tabWidth: 2,
            keywordCase: 'lower'
          })
          if (formatted !== text) {
            event.preventDefault()
            const { from, to } = view.state.selection.main
            view.dispatch({
              changes: { from, to, insert: formatted }
            })
            return true
          }
        } catch {
          // Partial SQL may fail to parse — let paste proceed normally
        }
        return false
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        executionKeymap,
        oneDark,
        appTheme,
        sqlCompartment.of(
          sql({
            dialect: getSqlDialect(dialect),
            schema,
            upperCaseKeywords: false
          })
        ),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        errorLineField,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        pasteHandler
      ]
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    viewRef.current = view
    if (onEditorReady) onEditorReady(view)

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync external value changes (e.g. loading from history) ────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value }
      })
    }
  }, [value])

  // ── Reconfigure SQL dialect + schema when they change ────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: sqlCompartmentRef.current.reconfigure(
        sql({
          dialect: getSqlDialect(dialect),
          schema,
          upperCaseKeywords: false
        })
      )
    })
  }, [schema, dialect])

  // ── Sync readOnly ─────────────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartmentRef.current.reconfigure(
        EditorState.readOnly.of(readOnly)
      )
    })
  }, [readOnly])

  // ── Error line decoration ─────────────────────────────────────────
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: setErrorLine.of(errorLine ?? null)
    })
  }, [errorLine])

  // ── Format method (can be called from toolbar) ────────────────────
  const format = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    try {
      const formatted = sqlFormat(current, {
        language: getFormatterDialect(dialect),
        tabWidth: 2,
        keywordCase: 'lower'
      })
      if (formatted !== current) {
        view.dispatch({
          changes: { from: 0, to: current.length, insert: formatted }
        })
      }
    } catch {
      // Partial SQL may fail — silently ignore
    }
  }, [dialect])

  // Expose format method via container data attribute for parent access
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { formatSql?: () => void }).formatSql = format
    }
  }, [format])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      data-codemirror="true"
    />
  )
})

export default SqlEditor

/**
 * Insert text at the cursor position in a given EditorView.
 * Focuses the editor after insertion.
 */
export function insertAtCursor(view: EditorView, text: string): void {
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length }
  })
  view.focus()
}
