---
phase: 02-token-layer
plan: 03
subsystem: ui
tags: [tabs, dialog, accordion, sheet, command, animation, framer-motion, cmdk]

requires:
  - phase: 01-02
    provides: "HSL token system, cn() utility"
provides:
  - "Animated Tabs with framer-motion sliding indicator bar"
  - "Dialog with scale+fade animation, blur overlay, 28px radius"
  - "Accordion with height animation and chevron rotation"
  - "Sheet with slide animation from any side"
  - "Command palette base (cmdk) with keyboard navigation"
affects: [03-shared-components, 04-screen-migration]

tech-stack:
  added: [cmdk]
  patterns: ["framer-motion layoutId for Tabs indicator", "Radix Dialog for Sheet (shared primitive)", "cmdk for Command"]

key-files:
  created:
    - src/renderer/src/components/ui/tabs.tsx
    - src/renderer/src/components/ui/dialog.tsx
    - src/renderer/src/components/ui/accordion.tsx
    - src/renderer/src/components/ui/sheet.tsx
    - src/renderer/src/components/ui/command.tsx
  modified: []

key-decisions:
  - "Tabs uses MutationObserver to track data-state for framer-motion indicator (avoids prop drilling)"
  - "Dialog uses CSS animations (tw-animate-css) instead of framer-motion for simpler exit animation handling"
  - "Sheet reuses Radix Dialog primitive (same overlay/portal pattern)"
  - "Command wraps in our animated Dialog for CommandDialog variant"

## Self-Check: PASSED

commits:
  - "feat(02-03): create animated Tabs and Dialog with zenith-violet tokens"
  - "feat(02-03): create Accordion, Sheet, and Command components"
---
