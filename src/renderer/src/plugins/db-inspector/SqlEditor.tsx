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
import { EditorView, keymap, hoverTooltip } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { sql, PostgreSQL, MySQL } from '@codemirror/lang-sql'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { basicSetup } from 'codemirror'
import { Decoration, DecorationSet, ViewUpdate } from '@codemirror/view'
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
  /** Variable map for {{varName}} hover tooltips in the editor. */
  variables?: Record<string, string>
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
    fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
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
  },
  // Selection
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'oklch(72% 0.15 195 / 0.2) !important'
  },
  '.cm-activeLine': {
    backgroundColor: 'oklch(14% 0 0 / 0.5)'
  },
  '.cm-searchMatch': {
    backgroundColor: 'oklch(72% 0.15 195 / 0.3)',
    outline: '1px solid oklch(72% 0.15 195 / 0.5)'
  },
  '.cm-selectionMatch': {
    backgroundColor: 'oklch(72% 0.15 195 / 0.15)'
  },
  // Matching brackets
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'oklch(72% 0.15 195 / 0.25)',
    outline: '1px solid oklch(72% 0.15 195 / 0.5)'
  },
  // Tooltips & autocomplete
  '.cm-tooltip': {
    backgroundColor: 'var(--color-surface-elevated)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: '6px',
    boxShadow: '0 4px 12px oklch(0% 0 0 / 0.4)'
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    backgroundColor: 'oklch(72% 0.15 195 / 0.15)',
    color: 'var(--color-text-primary)'
  },
  '.cm-completionLabel': {
    color: 'var(--color-text-primary)'
  },
  '.cm-completionDetail': {
    color: 'var(--color-text-secondary)',
    fontStyle: 'italic'
  },
  // Panels (search, etc.)
  '.cm-panels': {
    backgroundColor: 'var(--color-surface)',
    borderTop: '1px solid var(--color-border)'
  },
  '.cm-panels input, .cm-panels button': {
    color: 'var(--color-text-primary)'
  },
  // Fold gutter
  '.cm-foldGutter span': {
    color: 'var(--color-text-secondary)'
  }
})

const appHighlighting = HighlightStyle.define([
  { tag: tags.keyword, color: 'oklch(75% 0.15 195)' },
  { tag: tags.definitionKeyword, color: 'oklch(75% 0.15 195)' },
  { tag: tags.operatorKeyword, color: 'oklch(75% 0.15 195)' },
  { tag: tags.controlKeyword, color: 'oklch(75% 0.15 195)' },
  { tag: tags.moduleKeyword, color: 'oklch(75% 0.15 195)' },
  { tag: tags.standard(tags.name), color: 'oklch(75% 0.15 195)' },
  { tag: tags.string, color: 'oklch(75% 0.15 145)' },
  { tag: tags.number, color: 'oklch(78% 0.15 70)' },
  { tag: tags.bool, color: 'oklch(78% 0.15 70)' },
  { tag: tags.null, color: 'oklch(65% 0.12 30)' },
  { tag: tags.operator, color: 'oklch(80% 0.08 60)' },
  { tag: tags.punctuation, color: 'oklch(60% 0 0)' },
  { tag: tags.comment, color: 'oklch(45% 0 0)', fontStyle: 'italic' },
  { tag: tags.lineComment, color: 'oklch(45% 0 0)', fontStyle: 'italic' },
  { tag: tags.blockComment, color: 'oklch(45% 0 0)', fontStyle: 'italic' },
  { tag: tags.name, color: 'var(--color-text-primary)' },
  { tag: tags.typeName, color: 'oklch(75% 0.12 280)' },
  { tag: tags.propertyName, color: 'oklch(80% 0.1 220)' },
  { tag: tags.special(tags.string), color: 'oklch(75% 0.15 145)' }
])

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
  onEditorReady,
  variables
}: SqlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const sqlCompartmentRef = useRef(new Compartment())
  const readOnlyCompartmentRef = useRef(new Compartment())
  const autoFormatTimerRef = useRef<number | undefined>(undefined)
  const isFormattingRef = useRef(false)
  const editorReadyRef = useRef(false)
  const variablesRef = useRef(variables)

  // Keep callbacks in refs to avoid recreating the editor on every render
  const onChangeRef = useRef(onChange)
  const onExecuteCurrentRef = useRef(onExecuteCurrent)
  const onExecuteAllRef = useRef(onExecuteAll)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onExecuteCurrentRef.current = onExecuteCurrent }, [onExecuteCurrent])
  useEffect(() => { onExecuteAllRef.current = onExecuteAll }, [onExecuteAll])
  useEffect(() => { variablesRef.current = variables }, [variables])

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
            keywordCase: 'upper'
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
        executionKeymap,
        basicSetup,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        appTheme,
        syntaxHighlighting(appHighlighting),
        sqlCompartment.of(
          sql({
            dialect: getSqlDialect(dialect),
            schema,
            upperCaseKeywords: true
          })
        ),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        errorLineField,
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged && !isFormattingRef.current) {
            if (!editorReadyRef.current) return // Skip during initialization
            // Only debounce on user input (not programmatic changes)
            const isUserInput = update.transactions.some(tr => tr.isUserEvent('input'))
            if (!isUserInput) return
            clearTimeout(autoFormatTimerRef.current)
            autoFormatTimerRef.current = window.setTimeout(() => {
              const view = viewRef.current
              if (!view) return
              const current = view.state.doc.toString()
              try {
                const formatted = sqlFormat(current, {
                  language: getFormatterDialect(dialect),
                  tabWidth: 2,
                  keywordCase: 'upper'
                })
                if (formatted !== current) {
                  const cursorPos = view.state.selection.main.head
                  const ratio = current.length > 0 ? cursorPos / current.length : 0
                  const newCursorPos = Math.min(
                    Math.round(ratio * formatted.length),
                    formatted.length
                  )
                  isFormattingRef.current = true
                  view.dispatch({
                    changes: { from: 0, to: current.length, insert: formatted },
                    selection: { anchor: newCursorPos }
                  })
                  isFormattingRef.current = false
                }
              } catch {
                // Partial SQL may fail — silently ignore
              }
            }, 1500)
          }
        }),
        pasteHandler,
        hoverTooltip((view, pos) => {
          const doc = view.state.doc.toString()
          const before = doc.lastIndexOf('{{', pos)
          if (before === -1) return null
          const after = doc.indexOf('}}', before + 2)
          if (after === -1 || pos > after + 2) return null
          if (pos < before || pos > after + 2) return null

          const varName = doc.slice(before + 2, after)
          const vars = variablesRef.current
          if (!vars || !(varName in vars)) return null

          return {
            pos: before,
            end: after + 2,
            above: true,
            create: () => {
              const dom = document.createElement('div')
              dom.style.cssText = 'padding: 4px 8px; font-size: 12px; font-family: monospace; background: var(--color-surface-elevated); border: 1px solid var(--color-border); border-radius: 4px; color: var(--color-text-primary); box-shadow: 0 2px 8px oklch(0% 0 0 / 0.3);'
              dom.innerHTML = `<span style="color: oklch(72% 0.15 195)">${varName}</span> <span style="color: oklch(55% 0 0)">=</span> <span>${vars[varName] || '&lt;empty&gt;'}</span>`
              return { dom }
            }
          }
        })
      ]
    })

    const view = new EditorView({
      state,
      parent: containerRef.current
    })

    viewRef.current = view
    if (onEditorReady) onEditorReady(view)
    setTimeout(() => { editorReadyRef.current = true }, 500)

    return () => {
      clearTimeout(autoFormatTimerRef.current)
      editorReadyRef.current = false
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
          upperCaseKeywords: true
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
        keywordCase: 'upper'
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
