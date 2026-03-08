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
function getShellEnv(): NodeJS.ProcessEnv {
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

  // Write prompt to stdin, then close to signal EOF
  child.stdin.write(fullPrompt)
  child.stdin.end()

  // Accumulate full text for token estimation
  let fullText = ''

  // Stream stdout chunks to renderer
  child.stdout.on('data', (data: Buffer) => {
    if (mainWindow.isDestroyed()) {
      child.kill()
      return
    }
    const chunk = data.toString()
    fullText += chunk
    mainWindow.webContents.send('ai:stream:chunk', { sessionId, chunk })
  })

  // Log stderr for debugging (some CLI tools output progress info here)
  child.stderr.on('data', (data: Buffer) => {
    console.warn(`[cli-stream] ${command} stderr:`, data.toString().trim())
  })

  child.on('close', (code) => {
    activeCliSessions.delete(sessionId)

    if (mainWindow.isDestroyed()) return

    if (code === 0 || code === null) {
      // Estimate tokens from output length (~4 chars per token)
      const estimatedTokens = Math.ceil(fullText.length / 4)
      mainWindow.webContents.send('ai:stream:done', {
        sessionId,
        usage: estimatedTokens > 0
          ? { totalTokens: estimatedTokens, isEstimated: true }
          : undefined
      })
    } else {
      mainWindow.webContents.send('ai:stream:error', {
        sessionId,
        error: `CLI process exited with code ${code}`
      })
    }
  })

  child.on('error', (err) => {
    activeCliSessions.delete(sessionId)

    if (mainWindow.isDestroyed()) return

    mainWindow.webContents.send('ai:stream:error', {
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
 * Stream a generic AI analysis using a local CLI tool.
 * Unlike streamCliReview(), this accepts separate systemPrompt and userPrompt parameters
 * making it reusable for Database Q&A, Query Optimization, and other future features.
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

  child.stdin.write(fullPrompt)
  child.stdin.end()

  // Accumulate full text for token estimation
  let fullText = ''

  child.stdout.on('data', (data: Buffer) => {
    if (mainWindow.isDestroyed()) {
      child.kill()
      return
    }
    const chunk = data.toString()
    fullText += chunk
    mainWindow.webContents.send('ai:stream:chunk', { sessionId, chunk })
  })

  child.stderr.on('data', (data: Buffer) => {
    console.warn(`[cli-stream] ${command} stderr:`, data.toString().trim())
  })

  child.on('close', (code) => {
    activeCliSessions.delete(sessionId)
    if (mainWindow.isDestroyed()) return

    if (code === 0 || code === null) {
      // Estimate tokens from output length (~4 chars per token)
      const estimatedTokens = Math.ceil(fullText.length / 4)
      mainWindow.webContents.send('ai:stream:done', {
        sessionId,
        usage: estimatedTokens > 0
          ? { totalTokens: estimatedTokens, isEstimated: true }
          : undefined
      })
    } else {
      mainWindow.webContents.send('ai:stream:error', {
        sessionId,
        error: `CLI process exited with code ${code}`
      })
    }
  })

  child.on('error', (err) => {
    activeCliSessions.delete(sessionId)
    if (mainWindow.isDestroyed()) return

    mainWindow.webContents.send('ai:stream:error', {
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
