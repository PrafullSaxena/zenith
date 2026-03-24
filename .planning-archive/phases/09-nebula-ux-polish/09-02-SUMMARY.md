---
phase: 09-nebula-ux-polish
plan: 02
subsystem: ui
tags: [tiptap, bubble-menu, rich-text, link, image, table, floating-toolbar, notion-style]

# Dependency graph
requires:
  - phase: 09-nebula-ux-polish
    provides: Data layer with pinned notes, content previews, audio IPC, tiptap table/image packages
provides:
  - FloatingToolbar with BubbleMenu and 11 formatting buttons
  - LinkDialog for Cmd+K link insertion with viewport edge detection
  - TableControls for table row/column management
  - Rewritten NoteEditor with inline title, auto-save dot, metadata line, topic tags
  - Table/image/link CSS styles under .nebula-editor scope
  - Equalizer animation keyframes for Plan 04 voice FAB
affects: [09-03, 09-04]

# Tech tracking
tech-stack:
  added: ["@tiptap/extension-link"]
  patterns: ["BubbleMenu from @tiptap/react/menus (not @tiptap/react)", "auto-save dot state machine (synced/unsaved/saving/just-saved)", "CustomKeyboardShortcuts Tiptap extension for headings + link dialog", "image paste/drag 5MB size guard in editorProps"]

key-files:
  created:
    - src/renderer/src/plugins/nebula/FloatingToolbar.tsx
    - src/renderer/src/plugins/nebula/LinkDialog.tsx
    - src/renderer/src/plugins/nebula/TableControls.tsx
  modified:
    - src/renderer/src/plugins/nebula/NoteEditor.tsx
    - src/renderer/src/plugins/nebula/NebulaView.tsx
    - src/renderer/src/assets/main.css
    - package.json

key-decisions:
  - "BubbleMenu imported from @tiptap/react/menus per Tiptap v3 requirement"
  - "Auto-save dot uses 4-state machine: synced -> unsaved -> saving -> just-saved -> synced"
  - "VoiceRecorder removed from NoteEditor; Plan 04 will relocate as FAB in NebulaView"
  - "Tag pills use rotating color palette from TAG_COLORS array"
  - "Image paste/drag validated at 5MB max via editorProps.handleDrop/handlePaste"
  - "TableControls rendered as conditional bar (not second BubbleMenu) to avoid conflicts"

patterns-established:
  - "FloatingToolbar BubbleMenu pattern: import from @tiptap/react/menus, shouldShow checks selection.empty"
  - "LinkDialog positioning: viewport edge detection with getBoundingClientRect + window.innerWidth/Height"
  - "CustomKeyboardShortcuts extension: Extension.create with addKeyboardShortcuts for Mod+Shift+N and Mod+K"
  - "Auto-save dot state machine derived from isSaving/showSaved props with 1.5s just-saved timeout"

requirements-completed: [NEBL-01]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 09 Plan 02: Note Editor UX Summary

**Notion-style NoteEditor with BubbleMenu floating toolbar, inline title, auto-save dot, metadata line, topic tags, and Link/Image/Table extensions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-10T13:38:14Z
- **Completed:** 2026-03-10T13:42:30Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created FloatingToolbar with BubbleMenu from @tiptap/react/menus featuring 11 formatting buttons (Bold, Italic, Strikethrough, Code, H1-H3, Lists, Blockquote, Link)
- Created LinkDialog for Cmd+K link insertion with viewport edge detection, pre-fill from existing links, and Escape/click-outside dismiss
- Created TableControls for in-table row/column management (add/delete row/column, delete table)
- Fully rewrote NoteEditor: removed fixed toolbar and VoiceRecorder, added seamless inline title, auto-save status dot, metadata line (relative time + word count), topic tag pills, and rich editor extensions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FloatingToolbar, LinkDialog, and TableControls components** - `1981cb0` (feat)
2. **Task 2: Rewrite NoteEditor with inline title, extensions, metadata, tags, and auto-save dot** - `47ee396` (feat)

## Files Created/Modified
- `src/renderer/src/plugins/nebula/FloatingToolbar.tsx` - BubbleMenu wrapper with 11 formatting buttons
- `src/renderer/src/plugins/nebula/LinkDialog.tsx` - Cmd+K link insertion popup with viewport edge detection
- `src/renderer/src/plugins/nebula/TableControls.tsx` - Table management bar (add/delete row/col)
- `src/renderer/src/plugins/nebula/NoteEditor.tsx` - Complete rewrite: inline title, BubbleMenu, metadata, tags, auto-save dot, Link/Image/Table extensions
- `src/renderer/src/plugins/nebula/NebulaView.tsx` - Updated to pass tags, onTagsChange, updatedAt props
- `src/renderer/src/assets/main.css` - Table CSS, column-resize-handle, selectedCell, image, link styles, equalizer animations
- `package.json` - Added @tiptap/extension-link explicit dependency

## Decisions Made
- BubbleMenu imported from `@tiptap/react/menus` (not `@tiptap/react`) per Tiptap v3 requirement to avoid "tippy is not a function" error
- Auto-save dot uses a 4-state machine (synced/unsaved/saving/just-saved) derived from isSaving and showSaved props with 1.5s green flash timeout
- VoiceRecorder removed from NoteEditor as Plan 04 will relocate it as a floating action button in NebulaView
- Tag pills use a rotating color palette for visual variety; tags stored in NoteFile.tags array
- Image paste/drag size validated at 5MB max via editorProps.handleDrop and handlePaste guards
- TableControls rendered as a conditional bar above the editor (not a second BubbleMenu) to avoid BubbleMenu conflicts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated NebulaView to pass new NoteEditor props**
- **Found during:** Task 2
- **Issue:** Rewritten NoteEditor requires tags, onTagsChange, and updatedAt props not in original NebulaView invocation
- **Fix:** Added NoteTag import, handleTagsChange callback, and three new props to NoteEditor JSX in NebulaView
- **Files modified:** src/renderer/src/plugins/nebula/NebulaView.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** 47ee396 (Task 2 commit)

**2. [Rule 3 - Blocking] Added @tiptap/extension-link as explicit dependency**
- **Found during:** Task 1
- **Issue:** Link extension was only a transitive dependency, not in package.json; explicit install needed for reliability
- **Fix:** Ran `npm install @tiptap/extension-link --save`
- **Files modified:** package.json, package-lock.json
- **Verification:** TypeScript compilation passes, import resolves
- **Committed in:** 1981cb0 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for TypeScript compilation and module resolution. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- NoteEditor fully rewritten with all Notion-style UX features; ready for Plan 03 (split-view layout) and Plan 04 (voice FAB relocation)
- FloatingToolbar, LinkDialog, and TableControls components available for integration
- Equalizer animation keyframes pre-added for Plan 04 voice recording FAB
- Table CSS styles ready for table extension usage

---
## Self-Check: PASSED

All created files verified on disk. Both task commits (1981cb0, 47ee396) confirmed in git log.

---
*Phase: 09-nebula-ux-polish*
*Completed: 2026-03-10*
