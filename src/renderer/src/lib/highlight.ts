/**
 * Shared highlight.js setup — tree-shaken to only include
 * languages relevant to Zenith's DB Inspector and Code Review plugins.
 *
 * Usage:
 *   import { highlightCode } from '@/lib/highlight'
 *   const html = highlightCode(code, 'sql')
 *   <code dangerouslySetInnerHTML={{ __html: html }} />
 */

import hljs from 'highlight.js/lib/core'

// ── Register languages ──────────────────────────────────────────────
import sql from 'highlight.js/lib/languages/sql'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'

hljs.registerLanguage('sql', sql)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)

// ── Aliases ─────────────────────────────────────────────────────────
// Map common fence labels to registered languages
const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  postgresql: 'sql',
  pgsql: 'sql',
  psql: 'sql',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  html: 'xml',
  yml: 'yaml',
  md: 'markdown',
  plaintext: '',
  text: '',
  txt: '',
}

/**
 * Highlight a code string and return an HTML string.
 *
 * @param code - Raw code string
 * @param lang - Optional language hint (e.g. 'sql', 'js', 'python').
 *               Falls back to auto-detection if not provided.
 * @returns HTML string with <span class="hljs-*"> tokens.
 */
export function highlightCode(code: string, lang?: string): string {
  const normalizedLang = lang?.toLowerCase().trim() ?? ''
  const resolvedLang = ALIASES[normalizedLang] ?? normalizedLang

  // If the language is explicitly set to plain text, return escaped HTML
  if (resolvedLang === '' && normalizedLang !== '') {
    return escapeHtml(code)
  }

  try {
    if (resolvedLang && hljs.getLanguage(resolvedLang)) {
      return hljs.highlight(code, { language: resolvedLang }).value
    }
    // Auto-detect if no language specified
    return hljs.highlightAuto(code).value
  } catch {
    // Fallback: return escaped plain text
    return escapeHtml(code)
  }
}

/** Escape HTML entities to prevent XSS when using dangerouslySetInnerHTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
