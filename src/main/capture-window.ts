import { BrowserWindow, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

let captureWindow: BrowserWindow | null = null

export function createCaptureWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width: 540,
    height: 300,  // always fixed — card is content-sized, extra area is transparent
    x: Math.floor((width - 540) / 2),
    y: Math.floor(height * 0.25),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    movable: false,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  // Load capture route
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/capture`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/capture' })
  }

  win.on('closed', () => {
    captureWindow = null
  })

  // Close on blur (clicked outside)
  win.on('blur', () => {
    if (captureWindow && captureWindow.isVisible()) {
      captureWindow.hide()
    }
  })

  return win
}

export function showCaptureWindow(): void {
  if (!captureWindow || captureWindow.isDestroyed()) {
    captureWindow = createCaptureWindow()
  }

  if (!captureWindow.isVisible()) {
    // Re-center on current display each time
    const { width, height } = screen.getPrimaryDisplay().workAreaSize
    captureWindow.setSize(540, 300)
    captureWindow.setPosition(Math.floor((width - 540) / 2), Math.floor(height * 0.25))
    captureWindow.show()
    captureWindow.focus()
  }
}

export function hideCaptureWindow(): void {
  if (captureWindow && !captureWindow.isDestroyed()) {
    captureWindow.hide()
  }
}

export function getCaptureWindow(): BrowserWindow | null {
  return captureWindow
}
