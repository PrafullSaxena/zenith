import { app, BrowserWindow, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'
import { getSetting } from './settings-store'
import { installLogCollector } from './log-collector'
import WinStateModule from 'electron-win-state'
// CJS/ESM interop: electron-win-state uses module.exports = { default: Class }
const WinState = (WinStateModule as { default?: typeof WinStateModule }).default || WinStateModule

// Install log collector early so ALL console output is captured
installLogCollector()

// ── Global safety net for EPIPE / stream errors ─────────────────────
// CLI-based AI streaming spawns child processes whose pipes can break
// if the process exits unexpectedly. Without a handler these bubble up
// as uncaught exceptions and crash the app. We log them and move on.
process.on('uncaughtException', (err) => {
  if (err && 'code' in err && (err as NodeJS.ErrnoException).code === 'EPIPE') {
    console.warn('[main] Suppressed EPIPE error (broken pipe):', err.message)
    return // Swallow — the stream cleanup handlers will take care of the rest
  }
  // For non-EPIPE errors, log and re-throw so they surface normally
  console.error('[main] Uncaught exception:', err)
  throw err
})

// Set app name early so macOS menu bar, dock tooltip, and About dialog show "Zenith"
// (In production electron-builder handles this, but dev mode defaults to "Electron")
app.name = 'Zenith'
if (process.platform === 'darwin') {
  app.setName('Zenith')
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const winState = new WinState({
    defaultWidth: 1280,
    defaultHeight: 800,
  })

  // App icon — used in dev mode & Linux; macOS production uses the .icns in build/
  const iconPath = join(__dirname, '../../resources/icon.png')
  const appIcon = nativeImage.createFromPath(iconPath)

  // Theme-aware background color to prevent white flash on load
  const theme = getSetting('general.theme') as string | undefined
  const bgColor = theme === 'portfolio' ? '#0f172a' : '#0f0f0f'

  mainWindow = new BrowserWindow({
    ...winState.winOptions,
    icon: appIcon,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    // macOS: traffic lights stay native; Windows/Linux: overlay
    ...(process.platform !== 'darwin'
      ? { titleBarOverlay: { color: bgColor, symbolColor: '#a0a0a0', height: 32 } }
      : {}),
    backgroundColor: bgColor,
    show: false, // Show after ready-to-show avoids visual jump
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false, // MANDATORY — never enable
      contextIsolation: true, // MANDATORY — never disable
      sandbox: true, // Additional renderer hardening
    },
  })

  // CSP header: strict in production, relaxed in dev for Vite HMR
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = is.dev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.tldraw.com; font-src 'self' data: https://cdn.tldraw.com; connect-src 'self' ws://localhost:* https://cdn.tldraw.com"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.tldraw.com; font-src 'self' data: https://cdn.tldraw.com; connect-src 'self' https://cdn.tldraw.com"
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  // Track window size/position for persistence across sessions
  winState.manage(mainWindow)

  mainWindow.once('ready-to-show', () => mainWindow!.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// macOS standard menu — appMenu picks up app.name for "About Zenith", "Quit Zenith", etc.
function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const template = Menu.buildFromTemplate([
    ...(isMac
      ? [{ role: 'appMenu' as const }]
      : []),
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const },
  ])
  Menu.setApplicationMenu(template)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set dock icon on macOS (dev mode — production uses the .icns from build/)
  if (process.platform === 'darwin' && is.dev) {
    const dockIcon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
  }

  registerIpcHandlers()
  createWindow()
  buildMenu()

  app.on('activate', () => {
    // On macOS re-create a window when dock icon is clicked and no windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
