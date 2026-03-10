/**
 * Lowlight setup for Tiptap CodeBlockLowlight extension.
 *
 * Lowlight is a thin bridge that feeds highlight.js output into ProseMirror's
 * decoration system — the same highlight.js engine used by lib/highlight.ts.
 * We register the same languages here, plus popular extras for note-taking.
 *
 * The hljs-zenith.css theme (imported globally in main.tsx) provides
 * all .hljs-* class styling — no additional theme import needed.
 */

import { createLowlight } from 'lowlight'

// ── Same languages as lib/highlight.ts ──────────────────────────────
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

// ── Additional popular languages for note-taking ────────────────────
import java from 'highlight.js/lib/languages/java'
import csharp from 'highlight.js/lib/languages/csharp'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import ruby from 'highlight.js/lib/languages/ruby'
import php from 'highlight.js/lib/languages/php'
import swift from 'highlight.js/lib/languages/swift'
import kotlin from 'highlight.js/lib/languages/kotlin'

const lowlight = createLowlight()

lowlight.register('sql', sql)
lowlight.register('javascript', javascript)
lowlight.register('typescript', typescript)
lowlight.register('python', python)
lowlight.register('json', json)
lowlight.register('bash', bash)
lowlight.register('xml', xml)
lowlight.register('css', css)
lowlight.register('diff', diff)
lowlight.register('yaml', yaml)
lowlight.register('markdown', markdown)
lowlight.register('java', java)
lowlight.register('csharp', csharp)
lowlight.register('cpp', cpp)
lowlight.register('c', c)
lowlight.register('go', go)
lowlight.register('rust', rust)
lowlight.register('ruby', ruby)
lowlight.register('php', php)
lowlight.register('swift', swift)
lowlight.register('kotlin', kotlin)

// ── Aliases (matching lib/highlight.ts) ─────────────────────────────
lowlight.registerAlias('javascript', ['js', 'jsx'])
lowlight.registerAlias('typescript', ['ts', 'tsx'])
lowlight.registerAlias('bash', ['sh', 'shell', 'zsh'])
lowlight.registerAlias('xml', ['html'])
lowlight.registerAlias('yaml', ['yml'])
lowlight.registerAlias('markdown', ['md'])
lowlight.registerAlias('sql', ['postgresql', 'pgsql', 'psql'])
lowlight.registerAlias('csharp', ['cs'])

/** All languages registered in lowlight, for the language selector dropdown. */
export const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text', ext: 'txt' },
  { value: 'javascript', label: 'JavaScript', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', ext: 'ts' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'csharp', label: 'C#', ext: 'cs' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
  { value: 'c', label: 'C', ext: 'c' },
  { value: 'go', label: 'Go', ext: 'go' },
  { value: 'rust', label: 'Rust', ext: 'rs' },
  { value: 'ruby', label: 'Ruby', ext: 'rb' },
  { value: 'php', label: 'PHP', ext: 'php' },
  { value: 'swift', label: 'Swift', ext: 'swift' },
  { value: 'kotlin', label: 'Kotlin', ext: 'kt' },
  { value: 'sql', label: 'SQL', ext: 'sql' },
  { value: 'css', label: 'CSS', ext: 'css' },
  { value: 'xml', label: 'XML', ext: 'xml' },
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'yaml', label: 'YAML', ext: 'yml' },
  { value: 'bash', label: 'Bash', ext: 'sh' },
  { value: 'markdown', label: 'Markdown', ext: 'md' },
  { value: 'diff', label: 'Diff', ext: 'diff' }
] as const

export { lowlight }
