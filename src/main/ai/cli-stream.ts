/**
 * CLI-based AI review streaming module.
 * Spawns a local CLI tool (e.g., `claude -p`, `gemini prompt -`),
 * pipes the prompt via stdin, and streams stdout chunks to the renderer.
 *
 * Channels (same as SDK streaming):
 *   ai:stream:chunk  - { sessionId, chunk }  per stdout data event
 *   ai:stream:done   - { sessionId }         on process exit (code 0)
 *   ai:stream:error  - { sessionId, error }  on failure / non-zero exit
 */

import type { BrowserWindow } from 'electron'
import { spawn, execFileSync, type ChildProcess } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

/**
 * Safely send an IPC message to the renderer.
 * Guards against the window being destroyed between the check and the send
 * (race condition), and swallows any resulting errors so the main process
 * doesn't crash with EPIPE / ERR_IPC_CHANNEL_CLOSED.
 */
function safeSend(win: BrowserWindow, channel: string, data: unknown): boolean {
  try {
    if (win.isDestroyed() || !win.webContents) return false
    win.webContents.send(channel, data)
    return true
  } catch {
    // Window was destroyed between the check and the send — ignore.
    return false
  }
}

/** Active CLI sessions keyed by sessionId, used for cancellation. */
const activeCliSessions = new Map<string, ChildProcess>()

/**
 * Resolve the user's full login-shell PATH.
 *
 * Electron apps launched from Finder / Dock inherit a minimal PATH
 * (e.g. /usr/bin:/bin) which won't include Homebrew, npm-global, pip,
 * or other user-installed binary directories. We run a one-shot login
 * shell to capture the real PATH from the user's profile files.
 *
 * The result is cached so this only runs once per app session.
 */
let _resolvedPath: string | null = null
function getLoginShellPath(): string {
  if (_resolvedPath !== null) return _resolvedPath

  // --- Step 1: Get the login shell's PATH (at minimum the system paths) ---
  let basePath = process.env.PATH || ''
  try {
    const shell = process.env.SHELL || '/bin/bash'
    const result = execFileSync(shell, ['-lc', 'echo $PATH'], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    }).trim()
    if (result) basePath = result
  } catch {
    console.warn('[cli-stream] Login shell PATH probe failed, using process.env.PATH')
  }

  // --- Step 2: Discover user binary directories that exist on disk ---
  // .zshrc / .bashrc often adds these, but sourcing rc files hangs in
  // Electron (heavy init: oh-my-zsh, nvm, conda, etc.). Instead, we
  // directly check the filesystem for common binary directories.
  const home = process.env.HOME || ''
  const candidateDirs = [
    // User-level binary locations
    join(home, '.local', 'bin'),
    join(home, '.cargo', 'bin'),
    join(home, '.yarn', 'bin'),
    join(home, '.bun', 'bin'),
    join(home, '.deno', 'bin'),
    join(home, 'go', 'bin'),
    // Homebrew (Apple Silicon + Intel)
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    // System
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ]

  // Also discover nvm-managed Node.js bin directories
  const nvmDir = join(home, '.nvm', 'versions', 'node')
  try {
    if (existsSync(nvmDir)) {
      const versions = readdirSync(nvmDir).sort().reverse()
      for (const v of versions) {
        candidateDirs.push(join(nvmDir, v, 'bin'))
      }
    }
  } catch { /* nvm not present — fine */ }

  // Filter to directories that actually exist
  const userDirs = candidateDirs.filter((dir) => {
    try { return existsSync(dir) } catch { return false }
  })

  // --- Step 3: Merge user dirs + login shell PATH, deduplicate ---
  const allParts = [...userDirs, ...basePath.split(':')].filter(Boolean)
  _resolvedPath = [...new Set(allParts)].join(':')

  console.log('[cli-stream] Resolved PATH — entries:', _resolvedPath.split(':').length)
  console.log('[cli-stream] PATH:', _resolvedPath.substring(0, 400))

  return _resolvedPath
}

/**
 * Build an env object with the full login-shell PATH merged in.
 */
export function getShellEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: getLoginShellPath() }
}

/**
 * Build the review prompt using TOON (Token-Optimized Output Notation).
 * Produces structured findings that are both token-efficient and rich enough
 * for the ReviewFinding schema (severity, confidence, kind, title, body, fix).
 *
 * Output format:
 *   SEV|CONF|KIND|file:line|title|explanation|fix
 *   ---
 *   Overall summary text here
 */
function buildReviewPrompt(diff: string, guidelines?: string): string {
  let prompt = `You are a senior code reviewer. Analyze the unified diff below and report issues.

OUTPUT: One finding per line, 7 pipe-separated fields:
SEV|CONF|KIND|FILE:LINE|TITLE|EXPLANATION|FIX

SEV: B=blocking I=important S=suggestion
CONF: H=high M=medium L=low
KIND: bug sec perf cor mnt test sty

After all findings, output a line "---" then a 2-3 sentence summary.

RULES:
- Exact file paths from diff headers (strip a/ b/ prefix)
- LINE = new-file line number (from + lines)
- TITLE ≤10 words, EXPLANATION ≤30 words, FIX ≤20 words
- Max 10 findings, ordered by severity desc
- Skip pure style nits unless they harm readability
- No markdown, no JSON, no code fences`

  if (guidelines?.trim()) {
    prompt += `\n\nREVIEW GUIDELINES (provided by the team — prioritize these):\n${guidelines.trim()}`
  }

  prompt += `\n\nDIFF:\n${diff}`
  return prompt
}

/**
 * Stream an AI code review using a local CLI tool.
 *
 * 1. Combines system prompt + diff into a single prompt string.
 * 2. Spawns the CLI command as a child process.
 * 3. Writes the prompt to stdin and closes it.
 * 4. Forwards each stdout chunk to the renderer via webContents.send().
 * 5. Sends done/error events on process completion.
 */
export function streamCliReview(params: {
  mainWindow: BrowserWindow
  diff: string
  command: string
  sessionId: string
  guidelines?: string
}): void {
  const { mainWindow, diff, command, sessionId, guidelines } = params

  const fullPrompt = buildReviewPrompt(diff, guidelines)

  // Spawn via the user's login shell so the CLI binary is found on their real PATH.
  const child = spawn(command, {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: getShellEnv()
  })

  activeCliSessions.set(sessionId, child)

  // Attach error handlers to ALL child stdio streams to prevent
  // unhandled EPIPE / stream errors from crashing the main process.
  child.stdin.on('error', (err) => {
    console.warn(`[cli-stream] stdin error (${sessionId}):`, err.message)
  })
  child.stdout.on('error', (err) => {
    console.warn(`[cli-stream] stdout error (${sessionId}):`, err.message)
  })
  child.stderr.on('error', (err) => {
    console.warn(`[cli-stream] stderr error (${sessionId}):`, err.message)
  })

  // Write prompt to stdin with backpressure handling, then close to signal EOF
  const canContinue = child.stdin.write(fullPrompt)
  if (!canContinue) {
    child.stdin.once('drain', () => child.stdin.end())
  } else {
    child.stdin.end()
  }

  // Accumulate full text for token estimation and stderr for error reporting
  let fullText = ''
  let stderrText = ''

  // JSON event stream detection state (e.g. Codex CLI outputs JSON events)
  let isJsonStream: boolean | null = null
  let jsonBuffer = ''
  // Real usage from cursor-agent's result event (more accurate than estimation)
  let extractedUsage: { inputTokens: number; outputTokens: number } | undefined

  // Stream stdout chunks to renderer
  child.stdout.on('data', (data: Buffer) => {
    if (mainWindow.isDestroyed()) {
      child.kill()
      return
    }
    const chunk = data.toString()
    fullText += chunk

    // Auto-detect format from the first non-whitespace character
    if (isJsonStream === null) {
      const combined = (jsonBuffer + chunk).trimStart()
      if (combined.length > 0) {
        isJsonStream = combined[0] === '{'
      }
    }

    if (isJsonStream) {
      jsonBuffer += chunk
      const { text, remainder, usage } = extractJsonEventText(jsonBuffer)
      jsonBuffer = remainder
      if (usage) extractedUsage = usage
      if (text) {
        safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk: text })
      }
    } else {
      safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk })
    }
  })

  // Accumulate stderr so we can include it in the error message if the process fails.
  // Some CLI tools output progress info here, so we also log it for debugging.
  child.stderr.on('data', (data: Buffer) => {
    const text = data.toString().trim()
    stderrText += text + '\n'
    console.warn(`[cli-stream] ${command} stderr:`, text)
  })

  child.on('close', (code) => {
    activeCliSessions.delete(sessionId)

    // Flush any remaining JSON buffer
    if (isJsonStream && jsonBuffer.trim()) {
      const { text, usage } = extractJsonEventText(jsonBuffer)
      if (usage) extractedUsage = usage
      if (text) {
        safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk: text })
      }
      jsonBuffer = ''
    }

    if (code === 0 || code === null) {
      // Use real token counts from cursor-agent result event when available,
      // otherwise fall back to estimation (~4 chars per token).
      const usagePayload = extractedUsage
        ? { totalTokens: extractedUsage.inputTokens + extractedUsage.outputTokens, inputTokens: extractedUsage.inputTokens, outputTokens: extractedUsage.outputTokens }
        : (fullText.length > 0 ? { totalTokens: Math.ceil(fullText.length / 4), isEstimated: true } : undefined)
      safeSend(mainWindow, 'ai:stream:done', { sessionId, usage: usagePayload })
    } else {
      const detail = stderrText.trim()
      const errorMsg = detail
        ? `CLI process exited with code ${code}:\n${detail}`
        : `CLI process exited with code ${code}`
      safeSend(mainWindow, 'ai:stream:error', { sessionId, error: errorMsg })
    }
  })

  child.on('error', (err) => {
    activeCliSessions.delete(sessionId)
    safeSend(mainWindow, 'ai:stream:error', {
      sessionId,
      error: `Failed to start CLI: ${err.message}`
    })
  })
}

/**
 * Cancel an in-progress CLI review session.
 * Kills the child process (sends SIGTERM).
 */
export function cancelCliReview(sessionId: string): void {
  const child = activeCliSessions.get(sessionId)
  if (child) {
    child.kill('SIGTERM')
    activeCliSessions.delete(sessionId)
  }
}

/**
 * Extract displayable text from a buffer of JSON event objects.
 *
 * Handles multiple CLI JSON stream formats:
 *
 * Codex format:
 *   {"type":"item.completed","item":{"type":"agent_message","text":"..."}}
 *
 * Cursor Agent format (--output-format=stream-json --stream-partial-output):
 *   {"type":"assistant","timestamp_ms":...,"message":{"role":"assistant","content":[{"type":"text","text":"..."}]}}
 *   {"type":"result","subtype":"success","usage":{"inputTokens":N,"outputTokens":N,...}}
 *   Note: cursor-agent emits a final {"type":"assistant"} WITHOUT timestamp_ms that contains
 *   the full accumulated text — we skip it to avoid duplicating already-streamed content.
 *
 * Returns extracted text and any remaining incomplete JSON data.
 */
function extractJsonEventText(buffer: string): { text: string; remainder: string; usage?: { inputTokens: number; outputTokens: number } } {
  let text = ''
  let pos = 0
  let usage: { inputTokens: number; outputTokens: number } | undefined

  while (pos < buffer.length) {
    // Skip whitespace between JSON objects
    while (pos < buffer.length && /\s/.test(buffer[pos])) pos++
    if (pos >= buffer.length || buffer[pos] !== '{') break

    // Walk the string tracking brace depth to find the closing '}'
    let depth = 0
    let inStr = false
    let esc = false
    let end = -1

    for (let i = pos; i < buffer.length; i++) {
      const ch = buffer[i]
      if (esc) { esc = false; continue }
      if (ch === '\\' && inStr) { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (!inStr) {
        if (ch === '{') depth++
        else if (ch === '}') {
          depth--
          if (depth === 0) { end = i + 1; break }
        }
      }
    }

    if (end === -1) break // Incomplete JSON object — keep in buffer

    try {
      const event = JSON.parse(buffer.slice(pos, end))

      // Codex: extract text from completed agent messages
      if (event.type === 'item.completed' && event.item) {
        if (event.item.type === 'agent_message' && typeof event.item.text === 'string') {
          text += event.item.text
        }
      }

      // Cursor Agent: streaming assistant delta events (only those with timestamp_ms are
      // true partial deltas; the final assistant event without timestamp_ms is the full
      // accumulated text and must be skipped to avoid duplicating content).
      if (event.type === 'assistant' && event.timestamp_ms != null && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            text += block.text
          }
        }
      }

      // Cursor Agent: result event carries accurate token usage
      if (event.type === 'result' && event.subtype === 'success' && event.usage) {
        const u = event.usage
        if (typeof u.inputTokens === 'number' && typeof u.outputTokens === 'number') {
          usage = { inputTokens: u.inputTokens, outputTokens: u.outputTokens }
        }
      }
    } catch {
      // Malformed JSON — skip this object
    }

    pos = end
  }

  return { text, remainder: buffer.slice(pos), usage }
}

/**
 * Stream a generic AI analysis using a local CLI tool.
 * Unlike streamCliReview(), this accepts separate systemPrompt and userPrompt parameters
 * making it reusable for Database Q&A, Query Optimization, and other future features.
 *
 * Automatically detects structured JSON event streams (e.g. Codex CLI) and
 * extracts only the human-readable text. Plain-text CLI tools pass through unchanged.
 */
export function streamCliAnalysis(params: {
  mainWindow: BrowserWindow
  systemPrompt: string
  userPrompt: string
  command: string
  sessionId: string
}): void {
  const { mainWindow, systemPrompt, userPrompt, command, sessionId } = params

  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

  const child = spawn(command, {
    shell: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: getShellEnv()
  })

  activeCliSessions.set(sessionId, child)

  // Attach error handlers to ALL child stdio streams
  child.stdin.on('error', (err) => {
    console.warn(`[cli-stream] stdin error (${sessionId}):`, err.message)
  })
  child.stdout.on('error', (err) => {
    console.warn(`[cli-stream] stdout error (${sessionId}):`, err.message)
  })
  child.stderr.on('error', (err) => {
    console.warn(`[cli-stream] stderr error (${sessionId}):`, err.message)
  })

  // Write prompt to stdin with backpressure handling
  const canContinue = child.stdin.write(fullPrompt)
  if (!canContinue) {
    child.stdin.once('drain', () => child.stdin.end())
  } else {
    child.stdin.end()
  }

  // Accumulate full text for token estimation and stderr for error reporting
  let fullText = ''
  let stderrText = ''

  // JSON event stream detection state
  // null = haven't determined yet, true = JSON events, false = plain text
  let isJsonStream: boolean | null = null
  let jsonBuffer = ''
  // Real usage from cursor-agent's result event (more accurate than estimation)
  let extractedUsage: { inputTokens: number; outputTokens: number } | undefined

  child.stdout.on('data', (data: Buffer) => {
    if (mainWindow.isDestroyed()) {
      child.kill()
      return
    }
    const chunk = data.toString()
    fullText += chunk

    // Auto-detect format from the first non-whitespace character
    if (isJsonStream === null) {
      const combined = (jsonBuffer + chunk).trimStart()
      if (combined.length > 0) {
        isJsonStream = combined[0] === '{'
      }
    }

    if (isJsonStream) {
      // Buffer and parse JSON events, forward only extracted text
      jsonBuffer += chunk
      const { text, remainder, usage } = extractJsonEventText(jsonBuffer)
      jsonBuffer = remainder
      if (usage) extractedUsage = usage
      if (text) {
        safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk: text })
      }
    } else {
      // Plain text CLI — pass through unchanged
      safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk })
    }
  })

  // Accumulate stderr for error reporting
  child.stderr.on('data', (data: Buffer) => {
    const text = data.toString().trim()
    stderrText += text + '\n'
    console.warn(`[cli-stream] ${command} stderr:`, text)
  })

  child.on('close', (code) => {
    activeCliSessions.delete(sessionId)

    // Flush any remaining JSON buffer
    if (isJsonStream && jsonBuffer.trim()) {
      const { text, usage } = extractJsonEventText(jsonBuffer)
      if (usage) extractedUsage = usage
      if (text) {
        safeSend(mainWindow, 'ai:stream:chunk', { sessionId, chunk: text })
      }
      jsonBuffer = ''
    }

    if (code === 0 || code === null) {
      const usagePayload = extractedUsage
        ? { totalTokens: extractedUsage.inputTokens + extractedUsage.outputTokens, inputTokens: extractedUsage.inputTokens, outputTokens: extractedUsage.outputTokens }
        : (fullText.length > 0 ? { totalTokens: Math.ceil(fullText.length / 4), isEstimated: true } : undefined)
      safeSend(mainWindow, 'ai:stream:done', { sessionId, usage: usagePayload })
    } else {
      const detail = stderrText.trim()
      const errorMsg = detail
        ? `CLI process exited with code ${code}:\n${detail}`
        : `CLI process exited with code ${code}`
      safeSend(mainWindow, 'ai:stream:error', { sessionId, error: errorMsg })
    }
  })

  child.on('error', (err) => {
    activeCliSessions.delete(sessionId)
    safeSend(mainWindow, 'ai:stream:error', {
      sessionId,
      error: `Failed to start CLI: ${err.message}`
    })
  })
}

/**
 * Check if a CLI binary is available on the system PATH.
 * Extracts the binary name from the command and runs `which` (macOS/Linux)
 * or `where` (Windows) to check availability.
 *
 * Uses the resolved login-shell PATH so that binaries installed via
 * Homebrew, npm-global, pip, etc. are found even when Electron was
 * launched from Finder / Dock.
 */
export async function probeCliBinary(command: string): Promise<boolean> {
  const binary = command.split(/\s+/)[0]
  if (!binary) return false

  return new Promise((resolve) => {
    const checker = spawn(
      process.platform === 'win32' ? 'where' : 'which',
      [binary],
      { shell: true, env: getShellEnv() }
    )
    checker.on('close', (code) => {
      console.log(`[cli-stream] probe "${binary}": ${code === 0 ? 'FOUND' : 'NOT FOUND'}`)
      resolve(code === 0)
    })
    checker.on('error', (err) => {
      console.warn(`[cli-stream] probe "${binary}" error:`, err.message)
      resolve(false)
    })
  })
}
