---
phase: 09-nebula-ux-polish
plan: 04
subsystem: ui
tags: [voice-recorder, fab, transcription, toast, framer-motion, flexbox, bug-fixes]

# Dependency graph
requires:
  - phase: 09-nebula-ux-polish
    provides: Editor rewrite (09-02) and layout rewrite (09-03) for component integration points
affects: []

provides:
  - VoiceRecorder rewritten as FAB with framer-motion animated expansion to recording card
  - TranscriptionBlock inline component with colored speaker labels, editable names, audio playback
  - ToastContainer with animated enter/exit for notification toasts
  - NebulaView integration: FAB in content area, toast at root, transcription pipeline wired
  - Bug fix: @tiptap/extension-table named import (was default import, broke at runtime)
  - Bug fix: Replaced react-resizable-panels with plain flexbox to resolve infinite re-render loop

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FAB pattern: round button -> animated card expansion via framer-motion AnimatePresence"
    - "Three-state recorder: idle (mic FAB) -> recording (card with equalizer/timer) -> processing (spinner)"
    - "Colored speaker labels via deterministic hash-based color assignment from preset palette"
    - "Plain flexbox layout replaces react-resizable-panels to avoid infinite re-render loops"
    - "Fixed w-64 sidebar with collapse/expand toggle using PanelLeftClose/PanelLeft icons"
    - "Defensive tags={activeNote.tags ?? []} fallback for backward compatibility"
---

# Plan 09-04 Summary: Voice FAB, Transcription Block & Toast Notifications

## Overview

Transformed voice recording into a polished FAB experience, added inline transcription blocks with speaker labels, and integrated toast notifications. Also fixed two critical runtime bugs that emerged after integration.

## Tasks Completed

### Task 1: VoiceRecorder FAB + TranscriptionBlock + ToastContainer (commit 95668d3)

**VoiceRecorder.tsx** — Complete rewrite as floating action button:
- Idle: 48x48 round mic button, `absolute bottom-6 right-6`, with spring animation on mount
- Recording: Expands to 280x80 card with 4 animated equalizer bars, MM:SS timer, red stop button
- Processing: Spinner with "Transcribing..." text while background transcription runs
- Uses framer-motion `AnimatePresence mode="wait"` for smooth state transitions
- MediaRecorder API with webm/opus encoding

**TranscriptionBlock.tsx** — Inline collapsible transcription display:
- Collapsible header with ChevronDown/Right toggle
- Colored speaker labels (6-color palette, deterministic assignment by speaker name hash)
- Editable speaker names: click to rename, updates all instances via `updateSpeakerName` store action
- Audio playback: loads via `window.api.nebula.loadAudio`, creates Blob URL, Play/Pause toggle
- URL cleanup on unmount to prevent memory leaks

**ToastContainer.tsx** — Animated notification system:
- Fixed bottom-right position (above FAB to avoid overlap)
- Framer-motion AnimatePresence with spring physics enter/exit
- Click-to-navigate: clicking toast with noteId selects that note
- Auto-dismiss handled by store's 5s setTimeout

### Task 2: Integration wiring (commit 5c5c24d)

- NebulaView: VoiceRecorder FAB in content area (visible only when note selected), ToastContainer at root
- NoteEditor: TranscriptionBlock rendered below editor when note has transcription segments
- Store: `transcriptionSegments` map, `updateSpeakerName` action, toast on transcription completion
- Transcription pipeline: lastTranscript effect -> handleTranscription -> addToast with note title

### Bug Fix: @tiptap/extension-table import (commit 5fba374)

- `@tiptap/extension-table` only exports named exports, not default
- Changed `import Table from` to `import { Table } from` in NoteEditor.tsx
- Sub-packages (table-row, table-cell, table-header) correctly use default exports

### Bug Fix: Infinite re-render loop (commits 335caec, 784536e)

- react-resizable-panels caused "Maximum update depth exceeded" when navigating to Nebula
- First attempt: Removed useDefaultLayout hook, fixed onResize callbacks — insufficient
- Final fix: Completely replaced react-resizable-panels with plain flexbox layout
  - Fixed `w-64` sidebar with collapse/expand toggle
  - `w-3/5` / `w-2/5` editor/drawing split
  - Added defensive `tags={activeNote.tags ?? []}` fallback
  - PanelLeftClose/PanelLeft icons from lucide-react

## Deviations from Plan

1. **react-resizable-panels removed** — Plan 09-03 introduced this library, but it caused infinite re-render loops. Replaced with simpler flexbox. The sidebar is now fixed-width rather than resizable, and the drawing panel uses CSS percentage widths.
2. **Additional bug fix commits** — Two extra commits beyond the planned scope to fix runtime errors discovered during integration.

## Commits

| Hash | Description |
|------|-------------|
| `95668d3` | feat(09-04): rewrite VoiceRecorder as FAB with TranscriptionBlock and ToastContainer |
| `5c5c24d` | feat(09-04): wire VoiceRecorder FAB, TranscriptionBlock, and ToastContainer into views |
| `5fba374` | fix(nebula): use named import for @tiptap/extension-table |
| `335caec` | fix(nebula): resolve infinite re-render loop in NebulaView |
| `784536e` | fix(nebula): replace react-resizable-panels with flexbox to fix infinite re-render loop |

## Verification

- TypeScript: `npx tsc --noEmit` passes clean
- Build: `npm run build` succeeds (NebulaView chunk at 4,768 kB)
- Visual verification: Pending user walkthrough (checkpoint task)
