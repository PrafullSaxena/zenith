# Phase 9: Nebula UX Polish - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the user experience of the existing Nebula Notes section. This covers UX refinements to the text editor, drawing canvas integration, voice recording flow, and note management list. All core features already work — this phase polishes interactions, visual feedback, and usability.

Not in scope: new plugin capabilities, new tabs, AI features, knowledge graph changes.

</domain>

<decisions>
## Implementation Decisions

### Note Editor Experience
- Replace fixed toolbar with **floating toolbar** that appears near selected text (Notion-style)
- Full keyboard shortcuts: Cmd+B bold, Cmd+I italic, Cmd+Shift+1/2/3 headings, Cmd+Shift+8 bullet, etc.
- **Seamless inline title** — large text that flows into editor body, no visible border, just size difference
- **Ghost placeholder** text ("Start writing...") in empty notes — light gray, disappears on focus
- **Subtle auto-save dot** — small colored dot in header: gray=synced, orange=unsaved, green flash=just saved. No text
- Add **links** (Cmd+K) and **image embeds** (paste/drag) support
- Add **interactive tables** — click to add rows/columns, resize columns, drag to reorder
- **Metadata line below title** — small gray text showing last edited time + word count
- **Topic tags** displayed as small tag pills below the title
- Undo/redo via keyboard only (Cmd+Z / Cmd+Shift+Z) — no toolbar buttons

### Drawing Canvas Integration
- **Split view layout** — text editor on left, drawing canvas on right (replaces current toggle)
- Default split ratio: **60/40 text-first**
- **Both panels collapsible** — can go full-screen text OR full-screen drawing
- **Draggable divider** between panels — double-click to reset to 60/40
- When drawing panel is collapsed: **side rail tab** on the right edge labeled "Draw" that expands on click
- **Smooth slide animation** (~200ms) when panels open/close
- Use **tldraw's built-in toolbar** — no custom overlay
- Drawing panel **closed by default** for new notes
- **Global panel size** — one divider position for all notes (not per-note)
- Notes with drawings show a **small pen icon** in the note list

### Voice Recording Flow
- Replace bottom bar recorder with **floating action button** (FAB) in bottom-right corner
- Recording state: FAB expands into **small card** with animated equalizer bars, timer, stop button
- **Animated bars** (pre-animated equalizer) for visual feedback during recording — not real waveform
- Transcription appears as **inline transcription block** in the note — expandable/collapsible
- **Colored speaker labels** — each speaker gets a unique accent color
- **Editable speaker names** — click to rename, renames all instances in the block
- **Compressed audio storage** — save recording alongside note for playback, compressed to minimize disk space
- Small play button on transcription block to replay audio
- **Background processing** — user can continue editing while transcription processes
- **Toast notification** when transcription completes ("Transcription added to [Note Name]" with click-to-navigate)

### Note Management & List
- **Resizable sidebar** with draggable edge — collapsible to icon-only view, remembers width
- Collapsed sidebar shows **just an expand button** — clean minimal
- **2-line content preview** in note list items (title + 2 lines of content, truncated)
- **Pinned notes** support — pin icon on hover, pinned section at top, rest sorted by date
- **Confirmation dialog** for note deletion (modal "Are you sure?")
- **Both context menu AND hover icons** — right-click menu (Pin/Unpin, Duplicate, Delete) plus hover trash icon
- **Cmd+N keyboard shortcut** to create new note — focus jumps to title field
- **Automatic sort only** — pinned first, then by last updated. No manual drag-to-reorder

### Claude's Discretion
- Exact floating toolbar dimensions and positioning logic
- Animation easing curves and exact timing
- Image embed size constraints and drag-drop zone styling
- Table cell styling details (borders, padding, font)
- Transcription block collapse/expand animation
- Audio compression format and quality settings
- Context menu styling and positioning
- Sidebar min/max width constraints

</decisions>

<specifics>
## Specific Ideas

- Editor should feel like Notion — floating toolbar, seamless title, clean editing surface
- Split view for text+drawing is the key interaction change — inspired by apps that let you reference content side-by-side
- Voice FAB should feel like a modern mobile recording experience brought to desktop
- Note list should feel like Apple Notes or Bear — title + preview, pinned section, timestamps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-nebula-ux-polish*
*Context gathered: 2026-03-10*
