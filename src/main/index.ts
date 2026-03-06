import { app, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerIpcHandlers } from './ipc-handlers'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hidden',
    // macOS: traffic lights stay native; Windows/Linux: overlay
    ...(process.platform !== 'darwin'
      ? { titleBarOverlay: { color: '#0f0f0f', symbolColor: '#a0a0a0', height: 32 } }
      : {}),
    backgroundColor: '#0f0f0f', // Prevent white flash on load
    show: false, // Show after ready-to-show avoids visual jump
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegration: false, // MANDATORY — never enable
      contextIsolation: true, // MANDATORY — never disable
      sandbox: true, // Additional renderer hardening
    },
  })

  // CSP header: deny everything except self; adjust as plugins add external fetches
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:",
        ],
      },
    })
  })

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

// macOS standard menu (Edit, View, Window)
function buildMenu(): void {
  const template = Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ])
  Menu.setApplicationMenu(template)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
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
