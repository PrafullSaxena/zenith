#!/bin/bash
# Patch Electron's Info.plist so macOS dock shows "Zenith" instead of "Electron" in dev mode.
# This runs automatically via postinstall after npm install.

PLIST="node_modules/electron/dist/Electron.app/Contents/Info.plist"

if [ -f "$PLIST" ] && command -v plutil &> /dev/null; then
  plutil -replace CFBundleDisplayName -string Zenith "$PLIST"
  plutil -replace CFBundleName -string Zenith "$PLIST"
  echo "[postinstall] Patched Electron.app → Zenith"
fi
