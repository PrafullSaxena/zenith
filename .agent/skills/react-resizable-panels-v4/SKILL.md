---
description: React Resizable Panels v4 API Rules and Patterns
---

# React Resizable Panels v4 Guidelines

When implementing split-pane layouts in Zenith plugins, you MUST strictly adhere to the `react-resizable-panels` **v4** API. Do not use legacy v2/v3 patterns.

## 1. Imports
**Do not use** `PanelGroup` or `PanelResizeHandle` in your import block.
Use `Group` and `Separator` mapped to standard naming conventions:

```tsx
// ✅ CORRECT V4 IMPORTS
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
```

## 2. Layout Orientation
Layout directions must be explicitly passed to `orientation`, **not** `direction`.
```tsx
// ❌ WRONG
<PanelGroup direction="horizontal">

// ✅ CORRECT
<PanelGroup orientation="horizontal">
```

## 3. String-Based Sizing
Size props (defaultSize, minSize, maxSize) represent raw pixels internally by default. To use actual percentage representations, you **must use string representations**, otherwise it will measure in precise pixels instead.

```tsx
// ❌ WRONG — these compute to exactly 30 pixels
<Panel defaultSize={30} minSize={20} maxSize={50}>

// ✅ CORRECT — these compute dynamically exactly as percentage layouts
<Panel defaultSize="30%" minSize="20%" maxSize="50%">
```

## 4. Imperative Refs
Never pass standard `ref={ref}` directly to the `<Panel>` node.
Use `panelRef={ref}` to attach standard imperative commands like `collapse()` or `expand()`.

## 5. Resize Callbacks
Legacy properties like `onCollapse` and `onExpand` do not exist.
Hook into `onResize` natively:

```tsx
// ✅ V4 REVEALS SIZE OBJECTS INSTEAD OF PRIMITIVE NUMBERS
onResize={(size) => {
  setCollapsed(size.asPercentage === 0)
}}
```
The standard hook interface acts as: `(panelSize: { asPercentage: number; inPixels: number }, id, prevSize) => void`

## 6. Group Layout Change
`onLayoutChange` on `Group` returns an object mapping panel IDs to sizes, not an array of numbers like v3:

```tsx
// ❌ WRONG (v3 style)
onLayoutChange={(sizes: number[]) => saveSizes(sizes)}

// ✅ CORRECT (v4 style)
onLayoutChange={(sizes: { [panelId: string]: number }) => saveSizes(sizes)}
```
