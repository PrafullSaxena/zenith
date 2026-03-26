/**
 * CodeMirror 6 theme definitions that mirror the highlight.js themes
 * available in the settings dropdown.
 *
 * Each theme is a pair: [EditorView.theme(), syntaxHighlighting(HighlightStyle)]
 * bundled as a single Extension array.
 *
 * The "zenith" key returns the default app theme (oneDark-based).
 */
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Extension } from '@codemirror/state'

// ---------------------------------------------------------------------------
// Helper: build a CM theme + highlight style from a simple color palette
// ---------------------------------------------------------------------------

interface ThemePalette {
  bg: string
  fg: string
  gutterBg?: string
  gutterFg?: string
  selectionBg: string
  activeLine: string
  cursor: string
  keyword: string
  string: string
  number: string
  comment: string
  function?: string
  variable?: string
  type?: string
  operator?: string
  punctuation?: string
}

function buildTheme(p: ThemePalette): Extension[] {
  const viewTheme = EditorView.theme({
    '&': {
      backgroundColor: p.bg,
      color: p.fg
    },
    '.cm-content': {
      caretColor: p.cursor,
      fontFamily: "'Geist Mono', 'Fira Code', ui-monospace, SFMono-Regular, monospace"
    },
    '.cm-cursor': {
      borderLeftColor: p.cursor
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: `${p.selectionBg} !important`
    },
    '.cm-activeLine': {
      backgroundColor: p.activeLine
    },
    '.cm-gutters': {
      backgroundColor: p.gutterBg ?? p.bg,
      color: p.gutterFg ?? p.comment,
      borderRight: `1px solid ${p.activeLine}`
    },
    '.cm-activeLineGutter': {
      backgroundColor: p.activeLine
    }
  })

  const highlightStyle = HighlightStyle.define([
    { tag: tags.keyword, color: p.keyword },
    { tag: tags.definitionKeyword, color: p.keyword },
    { tag: tags.operatorKeyword, color: p.keyword },
    { tag: tags.controlKeyword, color: p.keyword },
    { tag: tags.moduleKeyword, color: p.keyword },
    { tag: tags.standard(tags.name), color: p.keyword },
    { tag: tags.string, color: p.string },
    { tag: tags.special(tags.string), color: p.string },
    { tag: tags.number, color: p.number },
    { tag: tags.bool, color: p.number },
    { tag: tags.null, color: p.number },
    { tag: tags.comment, color: p.comment, fontStyle: 'italic' },
    { tag: tags.lineComment, color: p.comment, fontStyle: 'italic' },
    { tag: tags.blockComment, color: p.comment, fontStyle: 'italic' },
    { tag: tags.name, color: p.fg },
    { tag: tags.typeName, color: p.type ?? p.keyword },
    { tag: tags.propertyName, color: p.function ?? p.fg },
    { tag: tags.function(tags.variableName), color: p.function ?? p.fg },
    { tag: tags.operator, color: p.operator ?? p.fg },
    { tag: tags.punctuation, color: p.punctuation ?? p.fg },
    { tag: tags.variableName, color: p.variable ?? p.fg }
  ])

  return [viewTheme, syntaxHighlighting(highlightStyle)]
}

// ---------------------------------------------------------------------------
// Theme palettes — colors extracted from the highlight.js themes
// ---------------------------------------------------------------------------

const PALETTES: Record<string, ThemePalette> = {
  'github-dark': {
    bg: '#0d1117', fg: '#c9d1d9', selectionBg: '#264f78',
    activeLine: '#161b22', cursor: '#c9d1d9',
    keyword: '#ff7b72', string: '#a5d6ff', number: '#79c0ff',
    comment: '#8b949e', function: '#d2a8ff', type: '#ffa657',
    variable: '#ffa657', operator: '#c9d1d9', punctuation: '#c9d1d9'
  },
  'github-dark-dimmed': {
    bg: '#22272e', fg: '#adbac7', selectionBg: '#264f78',
    activeLine: '#2d333b', cursor: '#adbac7',
    keyword: '#f47067', string: '#96d0ff', number: '#6cb6ff',
    comment: '#768390', function: '#dcbdfb', type: '#f69d50',
    variable: '#f69d50', operator: '#adbac7', punctuation: '#adbac7'
  },
  'atom-one-dark': {
    bg: '#282c34', fg: '#abb2bf', selectionBg: '#3e4451',
    activeLine: '#2c313c', cursor: '#528bff',
    keyword: '#c678dd', string: '#98c379', number: '#d19a66',
    comment: '#5c6370', function: '#61afef', type: '#e5c07b',
    variable: '#e06c75', operator: '#56b6c2', punctuation: '#abb2bf'
  },
  'monokai': {
    bg: '#272822', fg: '#f8f8f2', selectionBg: '#49483e',
    activeLine: '#3e3d32', cursor: '#f8f8f0',
    keyword: '#f92672', string: '#e6db74', number: '#ae81ff',
    comment: '#75715e', function: '#a6e22e', type: '#66d9ef',
    variable: '#f8f8f2', operator: '#f92672', punctuation: '#f8f8f2'
  },
  'monokai-sublime': {
    bg: '#23241f', fg: '#f8f8f2', selectionBg: '#49483e',
    activeLine: '#3e3d32', cursor: '#f8f8f0',
    keyword: '#f92672', string: '#e6db74', number: '#ae81ff',
    comment: '#75715e', function: '#a6e22e', type: '#66d9ef',
    variable: '#f8f8f2', operator: '#f92672', punctuation: '#f8f8f2'
  },
  'nord': {
    bg: '#2e3440', fg: '#d8dee9', selectionBg: '#434c5e',
    activeLine: '#3b4252', cursor: '#d8dee9',
    keyword: '#81a1c1', string: '#a3be8c', number: '#b48ead',
    comment: '#616e88', function: '#88c0d0', type: '#8fbcbb',
    variable: '#d8dee9', operator: '#81a1c1', punctuation: '#eceff4'
  },
  'tokyo-night-dark': {
    bg: '#1a1b26', fg: '#a9b1d6', selectionBg: '#33467c',
    activeLine: '#1e2030', cursor: '#c0caf5',
    keyword: '#9d7cd8', string: '#9ece6a', number: '#ff9e64',
    comment: '#565f89', function: '#7aa2f7', type: '#2ac3de',
    variable: '#c0caf5', operator: '#89ddff', punctuation: '#a9b1d6'
  },
  'night-owl': {
    bg: '#011627', fg: '#d6deeb', selectionBg: '#1d3b53',
    activeLine: '#01111d', cursor: '#80a4c2',
    keyword: '#c792ea', string: '#ecc48d', number: '#f78c6c',
    comment: '#637777', function: '#82aaff', type: '#ffcb8b',
    variable: '#d6deeb', operator: '#7fdbca', punctuation: '#d6deeb'
  },
  'obsidian': {
    bg: '#282b2e', fg: '#e0e2e4', selectionBg: '#3f4346',
    activeLine: '#2e3235', cursor: '#e0e2e4',
    keyword: '#93c763', string: '#ec7600', number: '#ffcd22',
    comment: '#66747b', function: '#678cb1', type: '#a082bd',
    variable: '#e0e2e4', operator: '#e8e2b7', punctuation: '#e8e2b7'
  },
  'vs2015': {
    bg: '#1e1e1e', fg: '#dcdcdc', selectionBg: '#264f78',
    activeLine: '#282828', cursor: '#dcdcdc',
    keyword: '#569cd6', string: '#d69d85', number: '#b5cea8',
    comment: '#57a64a', function: '#dcdcaa', type: '#4ec9b0',
    variable: '#9cdcfe', operator: '#d4d4d4', punctuation: '#d4d4d4'
  },
  'rose-pine': {
    bg: '#191724', fg: '#e0def4', selectionBg: '#2a283e',
    activeLine: '#1f1d2e', cursor: '#e0def4',
    keyword: '#31748f', string: '#f6c177', number: '#ebbcba',
    comment: '#6e6a86', function: '#9ccfd8', type: '#c4a7e7',
    variable: '#e0def4', operator: '#908caa', punctuation: '#908caa'
  },
  'rose-pine-moon': {
    bg: '#232136', fg: '#e0def4', selectionBg: '#393552',
    activeLine: '#2a273f', cursor: '#e0def4',
    keyword: '#3e8fb0', string: '#f6c177', number: '#ea9a97',
    comment: '#6e6a86', function: '#9ccfd8', type: '#c4a7e7',
    variable: '#e0def4', operator: '#908caa', punctuation: '#908caa'
  },
  'panda-syntax-dark': {
    bg: '#292a2b', fg: '#e6e6e6', selectionBg: '#3e4041',
    activeLine: '#303132', cursor: '#e6e6e6',
    keyword: '#ff75b5', string: '#19f9d8', number: '#ffb86c',
    comment: '#676b79', function: '#6fc1ff', type: '#ffcc95',
    variable: '#e6e6e6', operator: '#f3f3f3', punctuation: '#e6e6e6'
  },
  'shades-of-purple': {
    bg: '#2d2b55', fg: '#e3dfff', selectionBg: '#4d21fc33',
    activeLine: '#1e1e3f', cursor: '#fad000',
    keyword: '#ff9d00', string: '#a5ff90', number: '#ff628c',
    comment: '#b362ff', function: '#fad000', type: '#ff9d00',
    variable: '#e3dfff', operator: '#ff9d00', punctuation: '#e3dfff'
  },
  'a11y-dark': {
    bg: '#2b2b2b', fg: '#f8f8f2', selectionBg: '#3e3e3e',
    activeLine: '#333333', cursor: '#f8f8f2',
    keyword: '#ffa07a', string: '#abe338', number: '#d4d0ab',
    comment: '#d4d0ab', function: '#00e0e0', type: '#ffa07a',
    variable: '#f8f8f2', operator: '#ffa07a', punctuation: '#f8f8f2'
  },
  'agate': {
    bg: '#333', fg: '#fff', selectionBg: '#444',
    activeLine: '#3a3a3a', cursor: '#fff',
    keyword: '#fcc28c', string: '#7ec699', number: '#f08d49',
    comment: '#777', function: '#cc99cd', type: '#fcc28c',
    variable: '#fff', operator: '#67cdcc', punctuation: '#ccc'
  },
  'an-old-hope': {
    bg: '#1c1d21', fg: '#c0c5ce', selectionBg: '#2e3035',
    activeLine: '#232429', cursor: '#c0c5ce',
    keyword: '#b8a965', string: '#4fb4d7', number: '#cd9731',
    comment: '#686b78', function: '#eb3d54', type: '#ee7c2b',
    variable: '#c0c5ce', operator: '#4fb4d7', punctuation: '#c0c5ce'
  },
  'tomorrow-night-bright': {
    bg: '#000', fg: '#eaeaea', selectionBg: '#424242',
    activeLine: '#2a2a2a', cursor: '#eaeaea',
    keyword: '#c397d8', string: '#b9ca4a', number: '#e78c45',
    comment: '#969896', function: '#7aa6da', type: '#e7c547',
    variable: '#d54e53', operator: '#70c0b1', punctuation: '#eaeaea'
  },
  'srcery': {
    bg: '#1c1b19', fg: '#fce8c3', selectionBg: '#2d2c29',
    activeLine: '#262524', cursor: '#fce8c3',
    keyword: '#ef2f27', string: '#519f50', number: '#fbb829',
    comment: '#918175', function: '#2c78bf', type: '#e02c6d',
    variable: '#fce8c3', operator: '#fce8c3', punctuation: '#918175'
  }
}

// ---------------------------------------------------------------------------
// Build extensions map
// ---------------------------------------------------------------------------

const THEME_CACHE = new Map<string, Extension[]>()

/**
 * Get the CodeMirror theme extension for a given hljs theme name.
 * Returns `oneDark` for "zenith" or unknown theme names.
 */
export function getCodeMirrorTheme(hljsTheme: string | undefined): Extension[] {
  const key = hljsTheme ?? 'zenith'

  if (key === 'zenith') return [oneDark]

  const cached = THEME_CACHE.get(key)
  if (cached) return cached

  const palette = PALETTES[key]
  if (!palette) return [oneDark]

  const ext = buildTheme(palette)
  THEME_CACHE.set(key, ext)
  return ext
}
