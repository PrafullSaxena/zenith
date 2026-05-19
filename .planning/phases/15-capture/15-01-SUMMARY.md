---
phase: 15-capture
plan: "01"
status: complete
completed: 2026-05-20
commit: 8517468
---

## What Was Built

Main-process half of the capture popup:

1. **src/main/capture-window.ts** — BrowserWindow factory with:
   - 480px wide, frameless, transparent, always-on-top, skip-taskbar
   - Centers at 35% from top of screen (Spotlight-style)
   - Loads `#/capture` route via existing renderer
   - Blur handler hides popup on click-outside
   - `createCaptureWindow()`, `showCaptureWindow()`, `hideCaptureWindow()`, `getCaptureWindow()` exports

2. **src/main/index.ts** — registered `Command+Shift+D` / `Control+Shift+D` global shortcut → `showCaptureWindow()`; `will-quit` handler unregisters all shortcuts

3. **src/main/ipc-handlers.ts** — added:
   - `capture:getClipboard` — reads clipboard, returns text if URL (http/https) or Jira ID (ALPHA-123), else null
   - `capture:close` — calls `hideCaptureWindow()`
   - `clipboard` added to electron import; `hideCaptureWindow` imported from capture-window

## Deviations

None. All decisions from CONTEXT.md honored.

## Key Decisions

- `transparent: true` enables backdrop-blur CSS in renderer (BrowserWindow must be transparent for CSS blur to show through)
- `movable: false` — popup stays centered, no drag
- Using existing preload (`../preload/index.cjs`) — no separate preload needed
- Blur handler hides (not destroys) window for faster re-show on next hotkey

## Self-Check: PASSED
