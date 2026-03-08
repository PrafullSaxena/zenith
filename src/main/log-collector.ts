/**
 * In-memory log collector with disk export.
 *
 * Hooks into console.log / warn / error at startup and stores entries
 * in a bounded ring buffer. When the user triggers "Export Diagnostic Logs"
 * the collector writes a ZIP to the desktop containing:
 *   - main-process.log   (ring buffer contents)
 *   - zenith-settings.json (copy, credentials redacted)
 *   - system-info.json    (OS, Node, Electron, arch, etc.)
 */

import { app, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'
import * as os from 'os'

// ── Ring buffer ────────────────────────────────────────────────────
const MAX_ENTRIES = 2000
const logBuffer: { ts: string; level: string; message: string }[] = []

function pushEntry(level: string, args: unknown[]): void {
  const message = args
    .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
    .join(' ')
  logBuffer.push({ ts: new Date().toISOString(), level, message })
  if (logBuffer.length > MAX_ENTRIES) logBuffer.shift()
}

// ── Monkey-patch console to capture output ─────────────────────────
const _origLog = console.log.bind(console)
const _origWarn = console.warn.bind(console)
const _origError = console.error.bind(console)

export function installLogCollector(): void {
  console.log = (...args: unknown[]) => {
    pushEntry('INFO', args)
    _origLog(...args)
  }
  console.warn = (...args: unknown[]) => {
    pushEntry('WARN', args)
    _origWarn(...args)
  }
  console.error = (...args: unknown[]) => {
    pushEntry('ERROR', args)
    _origError(...args)
  }
  console.log('[log-collector] Installed — buffering up to', MAX_ENTRIES, 'entries')
}

// ── Gather system info ─────────────────────────────────────────────
function gatherSystemInfo(): Record<string, unknown> {
  let shellPath = ''
  try {
    shellPath = execSync('echo $PATH', { encoding: 'utf-8', timeout: 3000 }).trim()
  } catch { /* ignore */ }

  return {
    timestamp: new Date().toISOString(),
    app: {
      name: app.getName(),
      version: app.getVersion(),
      locale: app.getLocale(),
      userData: app.getPath('userData'),
      isPackaged: app.isPackaged
    },
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    v8: process.versions.v8,
    os: {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      type: os.type(),
      version: os.version?.() ?? 'unknown',
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024)} MB`,
      cpus: os.cpus().length
    },
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'undefined',
      PATH_entries: shellPath.split(':').length,
      SHELL: process.env.SHELL ?? 'undefined'
    }
  }
}

// ── Read settings with credential redaction ────────────────────────
function readRedactedSettings(): string {
  const settingsPath = join(app.getPath('userData'), 'zenith-settings.json')
  if (!existsSync(settingsPath)) return '{ "note": "settings file not found" }'

  try {
    const raw = readFileSync(settingsPath, 'utf-8')
    // Redact anything that looks like an API key or token
    return raw.replace(
      /("(?:apiKey|token|secret|password|credential)[^"]*"\s*:\s*")([^"]+)(")/gi,
      '$1[REDACTED]$3'
    )
  } catch (err) {
    return `{ "error": "failed to read settings: ${err}" }`
  }
}

// ── List data directory contents ───────────────────────────────────
function listDataDir(): string[] {
  const dataDir = app.getPath('userData')
  try {
    return readdirSync(dataDir).map((name) => {
      try {
        const st = statSync(join(dataDir, name))
        const size = st.isDirectory() ? 'dir' : `${(st.size / 1024).toFixed(1)} KB`
        return `${name}  (${size})`
      } catch {
        return name
      }
    })
  } catch {
    return ['(unable to list)']
  }
}

// ── Build ZIP (using Node built-in zlib, no extra deps) ────────────
// We write a simple multi-file ZIP archive manually.
// Format: local-file-header + data for each entry, then central directory.

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function buildZip(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = []
  const centralDir: Buffer[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, 'utf-8')
    const crc = crc32(file.data)

    // Local file header
    const localHeader = Buffer.alloc(30 + nameBytes.length)
    localHeader.writeUInt32LE(0x04034b50, 0)    // signature
    localHeader.writeUInt16LE(20, 4)             // version needed
    localHeader.writeUInt16LE(0, 6)              // flags
    localHeader.writeUInt16LE(0, 8)              // compression (store)
    localHeader.writeUInt16LE(0, 10)             // mod time
    localHeader.writeUInt16LE(0, 12)             // mod date
    localHeader.writeUInt32LE(crc, 14)           // crc-32
    localHeader.writeUInt32LE(file.data.length, 18)  // compressed size
    localHeader.writeUInt32LE(file.data.length, 22)  // uncompressed size
    localHeader.writeUInt16LE(nameBytes.length, 26)  // filename length
    localHeader.writeUInt16LE(0, 28)             // extra field length
    nameBytes.copy(localHeader, 30)

    parts.push(localHeader, file.data)

    // Central directory entry
    const cdEntry = Buffer.alloc(46 + nameBytes.length)
    cdEntry.writeUInt32LE(0x02014b50, 0)         // signature
    cdEntry.writeUInt16LE(20, 4)                 // version made by
    cdEntry.writeUInt16LE(20, 6)                 // version needed
    cdEntry.writeUInt16LE(0, 8)                  // flags
    cdEntry.writeUInt16LE(0, 10)                 // compression
    cdEntry.writeUInt16LE(0, 12)                 // mod time
    cdEntry.writeUInt16LE(0, 14)                 // mod date
    cdEntry.writeUInt32LE(crc, 16)               // crc-32
    cdEntry.writeUInt32LE(file.data.length, 20)  // compressed size
    cdEntry.writeUInt32LE(file.data.length, 24)  // uncompressed size
    cdEntry.writeUInt16LE(nameBytes.length, 28)  // filename length
    cdEntry.writeUInt16LE(0, 30)                 // extra field length
    cdEntry.writeUInt16LE(0, 32)                 // comment length
    cdEntry.writeUInt16LE(0, 34)                 // disk number start
    cdEntry.writeUInt16LE(0, 36)                 // internal attrs
    cdEntry.writeUInt32LE(0, 38)                 // external attrs
    cdEntry.writeUInt32LE(offset, 42)            // offset of local header
    nameBytes.copy(cdEntry, 46)

    centralDir.push(cdEntry)
    offset += localHeader.length + file.data.length
  }

  const centralDirBuf = Buffer.concat(centralDir)

  // End of central directory
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)                       // signature
  eocd.writeUInt16LE(0, 4)                                // disk number
  eocd.writeUInt16LE(0, 6)                                // disk with central dir
  eocd.writeUInt16LE(files.length, 8)                     // entries on disk
  eocd.writeUInt16LE(files.length, 10)                    // total entries
  eocd.writeUInt32LE(centralDirBuf.length, 12)            // central dir size
  eocd.writeUInt32LE(offset, 16)                          // central dir offset
  eocd.writeUInt16LE(0, 20)                               // comment length

  return Buffer.concat([...parts, centralDirBuf, eocd])
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Export diagnostic logs as a ZIP file.
 * Returns the path to the generated ZIP.
 * @param mainWindow — used to prompt with a save dialog
 */
export async function exportDiagnosticZip(mainWindow: BrowserWindow): Promise<string> {
  const { dialog } = await import('electron')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultName = `zenith-diagnostics-${timestamp}.zip`

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Diagnostic Logs',
    defaultPath: join(app.getPath('desktop'), defaultName),
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
  })

  if (!filePath) return '' // user cancelled

  // Assemble files
  const files: { name: string; data: Buffer }[] = []

  // 1. Main process log
  const logText = logBuffer
    .map((e) => `[${e.ts}] [${e.level}] ${e.message}`)
    .join('\n')
  files.push({ name: 'main-process.log', data: Buffer.from(logText, 'utf-8') })

  // 2. System info
  const sysInfo = JSON.stringify(gatherSystemInfo(), null, 2)
  files.push({ name: 'system-info.json', data: Buffer.from(sysInfo, 'utf-8') })

  // 3. Settings (redacted)
  files.push({
    name: 'zenith-settings-redacted.json',
    data: Buffer.from(readRedactedSettings(), 'utf-8')
  })

  // 4. Data directory listing
  const listing = listDataDir().join('\n')
  files.push({ name: 'data-directory-listing.txt', data: Buffer.from(listing, 'utf-8') })

  // 5. Window state (if present)
  const wsPath = join(app.getPath('userData'), 'window-state.json')
  if (existsSync(wsPath)) {
    try {
      files.push({ name: 'window-state.json', data: readFileSync(wsPath) })
    } catch { /* skip */ }
  }

  // Build ZIP and write
  const zipBuf = buildZip(files)
  writeFileSync(filePath, zipBuf)

  return filePath
}

/**
 * Get current log buffer contents (for programmatic access).
 */
export function getLogBuffer(): typeof logBuffer {
  return [...logBuffer]
}
