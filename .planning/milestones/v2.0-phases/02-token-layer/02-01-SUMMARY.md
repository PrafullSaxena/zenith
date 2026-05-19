---
phase: 02-token-layer
plan: 01
subsystem: ui
tags: [shadcn, components, card, input, select, badge, skeleton, separator, switch, label, textarea]

requires:
  - phase: 01-02
    provides: "HSL token system, cn() utility, button.tsx pattern"
provides:
  - "10 core shadcn UI components customized with zenith-violet tokens"
  - "Badge with 7 status-color variants (13% tinted backgrounds)"
  - "Button with rounded-2xl and press scale animation"
affects: [03-shared-components, 04-screen-migration]

tech-stack:
  added: []
  patterns: ["cva for variant definitions", "Radix primitives for Select/Switch/Separator/Label"]

key-files:
  created:
    - src/renderer/src/components/ui/card.tsx
    - src/renderer/src/components/ui/input.tsx
    - src/renderer/src/components/ui/label.tsx
    - src/renderer/src/components/ui/select.tsx
    - src/renderer/src/components/ui/textarea.tsx
    - src/renderer/src/components/ui/switch.tsx
    - src/renderer/src/components/ui/skeleton.tsx
    - src/renderer/src/components/ui/separator.tsx
    - src/renderer/src/components/ui/badge.tsx
  modified:
    - src/renderer/src/components/ui/button.tsx

key-decisions:
  - "Manual component creation instead of shadcn CLI (CLI fails with Electron alias config)"
  - "Button keeps outline and link variants alongside the 4 primary spec variants"

## Self-Check: PASSED

commits:
  - "feat(02-01): generate core shadcn components with zenith-violet tokens"
  - "feat(02-01): customize Button variants and create Badge with status colors"
---
