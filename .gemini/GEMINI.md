# GSD Methodology — Mission Control Rules

> **Get Shit Done**: A spec-driven, context-engineered development methodology.
> 
> These rules enforce disciplined, high-quality autonomous development.

---

## Canonical Rules

**All canonical rules are in [PROJECT_RULES.md](../PROJECT_RULES.md).**

This file provides Gemini-specific integration. For the complete methodology, see PROJECT_RULES.md.

---

## Core Principles

1. **Plan Before You Build** — No code without specification
2. **State Is Sacred** — Every action updates persistent memory
3. **Context Is Limited** — Prevent degradation through hygiene
4. **Verify Empirically** — No "trust me, it works"

---

## Quick Reference

```
Before coding    → Check SPEC.md is FINALIZED
Before file read → Search first, then targeted read
After each task  → Update STATE.md
After 3 failures → State dump + fresh session
Before "Done"    → Empirical proof captured
```

---

## Workflow Integration

These rules integrate with the GSD workflows:

| Workflow | Rules Enforced |
|----------|----------------|
| `/map` | Updates ARCHITECTURE.md, STACK.md |
| `/plan` | Enforces Planning Lock, creates ROADMAP |
| `/execute` | Enforces State Persistence after each task |
| `/verify` | Enforces Empirical Validation |
| `/pause` | Triggers Context Hygiene state dump |
| `/resume` | Loads state from STATE.md |

---

## Gemini-Specific Tips

For Gemini-specific enhancements, see [adapters/GEMINI.md](../adapters/GEMINI.md).

Key recommendations:
- **Flash** for quick iterations and simple edits
- **Pro** for complex planning and analysis
- Large context is available but **search-first** still applies

## react-resizable-panels v4 API rules:

Imports: Use Group, Panel, Separator — NOT PanelGroup, PanelResizeHandle (those were v2/v3 names)

import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'

Orientation, not direction: Use orientation="horizontal", never direction="horizontal"

Sizes are pixels by default, not percentages: Always use string format for percentage-based sizing:

// WRONG — these are 25 pixels, not 25%
defaultSize={25} minSize={15} maxSize={40}

// CORRECT
defaultSize="25%" minSize="15%" maxSize="40%"

Panel ref: Use panelRef={ref}, not ref={ref}, to get the imperative handle (collapse(), expand(), isCollapsed())

No onCollapse/onExpand: Use onResize instead:

onResize={(size) => {
  setCollapsed(size.asPercentage === 0)
}}

The callback signature is (panelSize: { asPercentage: number; inPixels: number }, id, prevSize) => void

onLayoutChange on Group returns { [panelId: string]: number }, not number[]

Adding this to your project instructions will prevent any agent (or contributor) from repeating these v4 API mismatches across any plugin.

---

*GSD Methodology adapted for Google Antigravity*
*Canonical rules: [PROJECT_RULES.md](../PROJECT_RULES.md)*
*Source: https://github.com/glittercowboy/get-shit-done*

