# Zenith Design System — Master

> **LOGIC:** When building a specific page, first check `design-system/zenith/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Zenith
**Updated:** 2026-03-27
**Style:** Modern Dark (Cinema Desktop) — Linear, Vercel, Raycast aesthetic
**Stack:** React 19 + shadcn/ui + Animate-UI + Tailwind CSS v4 + Framer Motion
**Mode:** Dark only (single theme, future-proof via CSS custom properties)

---

## Color Tokens

```css
:root, [data-theme="zenith-violet"] {
  /* Base surfaces — 3-tier depth system */
  --background: 240 10% 4%;           /* #09090b — page bg */
  --foreground: 0 0% 95%;             /* #f2f2f2 — primary text */
  --card: 240 6% 8%;                  /* #131318 — cards, sidebar, popovers */
  --card-foreground: 0 0% 95%;
  --popover: 240 6% 8%;
  --popover-foreground: 0 0% 95%;

  /* Accent — Violet */
  --primary: 263 70% 58%;             /* #7c3aed */
  --primary-foreground: 0 0% 100%;

  /* Secondary surfaces */
  --secondary: 240 4% 16%;            /* #27272d — table headers, nested */
  --secondary-foreground: 0 0% 85%;
  --muted: 240 4% 16%;
  --muted-foreground: 240 5% 65%;     /* #a1a1aa — muted text */

  /* Accent alias */
  --accent: 263 70% 58%;
  --accent-foreground: 0 0% 100%;

  /* Status */
  --destructive: 0 63% 51%;           /* #d13434 */
  --success: 142 71% 45%;             /* #21c55d */
  --warning: 38 92% 50%;              /* #f59e0b */
  --info: 217 91% 60%;                /* #3b82f6 */

  /* Chrome */
  --border: 240 4% 16%;
  --input: 240 4% 16%;
  --ring: 263 70% 58%;

  /* Radius */
  --radius: 1rem;                     /* 16px — base */
  --radius-lg: 1.75rem;               /* 28px — major cards */
  --radius-sm: 0.5rem;                /* 8px — small elements */
  --radius-pill: 9999px;              /* badges, pills */
}
```

## Surface Depth System

| Layer | Background | Border | Blur | Usage |
|-------|-----------|--------|------|-------|
| Page | `--background` + radial gradient | none | none | Body background |
| Sidebar / Header | `hsl(var(--card) / 0.88)` | `--border` | `backdrop-filter: blur(14px)` | Fixed nav, headers |
| Card | `hsl(var(--card))` | `--border` | none | Standard panels |
| Nested Card | `hsl(var(--background))` | `--border` | none | Cards inside cards |
| Table Header | `hsl(var(--secondary))` | `--border` | none | Column headers |

**Page radial gradient:**
```css
background: radial-gradient(circle at top, hsl(var(--primary) / 0.16), transparent 26%), hsl(var(--background));
```

## Typography

| Role | Font | Weights |
|------|------|---------|
| UI / Body | Inter | 300, 400, 500, 600, 700 |
| Code / Mono | JetBrains Mono | 400, 500, 600 |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

**Scale:** 12 / 13 / 14 / 16 / 18 / 20 / 24 / 30 / 36px
**Base:** 14px
**Line heights:** 1.4 (body), 1.2 (headings), 1.6 (code)
**Weight hierarchy:** 700 headings, 600 labels/buttons, 500 emphasis, 400 body

## Radius Tokens

| Element | Radius | Token |
|---------|--------|-------|
| Major cards, dialogs | 28px | `rounded-[28px]` / `--radius-lg` |
| Nested cards, buttons, inputs | 16px | `rounded-2xl` / `--radius` |
| Small elements, icon containers | 8px | `rounded-lg` / `--radius-sm` |
| Badges, pills | 9999px | `rounded-full` / `--radius-pill` |

## Spacing

4px base grid. Tailwind utility classes:

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| xs | 4px | `gap-1` / `p-1` | Tight gaps |
| sm | 8px | `gap-2` / `p-2` | Icon gaps, inline |
| md | 16px | `gap-4` / `p-4` | Standard padding |
| lg | 20px | `gap-5` / `p-5` | Card padding |
| xl | 24px | `gap-6` / `p-6` | Section gaps |
| 2xl | 32px | `gap-8` / `p-8` | Large sections |

## Shadows

Minimal shadows. No glow on general surfaces.

| Level | Value | Usage |
|-------|-------|-------|
| `shadow-xl` | Tailwind default | Elevated cards |
| `shadow-2xl` | Tailwind default | Major panels, sidebar |
| Glow dot | `0 0 20px <status-color>` | Incident status dots only |

## Status Color Patterns

| Pattern | CSS |
|---------|-----|
| Icon container | `bg-[hsl(var(--status)/0.13)]` + `text-[hsl(var(--status))]` |
| Badge | Same as icon container + `rounded-full` + `px-3 py-1 text-xs font-medium` |
| Glowing dot | `w-3 h-3 rounded-full bg-[status]` + `shadow-[0_0_20px_status]` |
| Active sidebar | `bg-[hsl(var(--primary)/0.18)]` + `border border-[hsl(var(--primary)/0.35)]` |
| Focus ring | `ring-2 ring-[hsl(var(--primary)/0.25)]` + `border-primary` |

## Animation Rules

| Animation | Duration | Easing | Library |
|-----------|----------|--------|---------|
| Hover, press | 150ms | ease-out | CSS transition |
| Tab switch, expand | 200-250ms | ease-out | Animate-UI |
| Page transition | 200ms | ease-out | Framer Motion |
| Dialog open/close | 200ms | spring(damping:20,stiffness:90) | Animate-UI |
| Sidebar collapse | 250ms | ease-out | Framer Motion |
| Skeleton shimmer | 1.5s loop | linear | CSS @keyframes |
| Button press | 150ms | ease-out | scale(0.97)->1.0 |
| Card hover | 200ms | ease-out | translateY(-1px) |
| Toast | 200ms | ease-out/in | Sonner |

**Mandatory:**
- Respect `prefers-reduced-motion: reduce`
- Exit 60-70% of enter duration
- Never block input during animation
- Max 1-2 animated elements per transition
- Use transform/opacity only (no width/height/top/left)

## Component Specs

### Buttons
```
Primary:   bg-primary text-primary-foreground rounded-2xl px-4 py-3 font-medium
Secondary: bg-secondary text-secondary-foreground rounded-2xl px-4 py-3 border border-border
Destructive: bg-destructive text-white rounded-2xl px-4 py-3 font-medium
Ghost:     bg-transparent text-muted-foreground hover:bg-secondary rounded-2xl px-4 py-3
Press:     scale(0.97) on active, 150ms ease-out
```

### Inputs
```
Base:    bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground
Focus:   border-primary ring-2 ring-primary/25
Error:   border-destructive
Placeholder: text-muted-foreground
```

### Cards
```
Standard: bg-card border border-border rounded-[28px] p-5 shadow-2xl
Nested:   bg-background border border-border rounded-[22px] p-4
Interactive: hover:translateY(-1px) hover:border-muted-foreground/30 transition-all 200ms
```

### Tables
```
Header:  bg-secondary text-muted-foreground text-xs font-semibold p-3
Row:     border-b border-border hover:bg-primary/4 p-3 text-sm
Cell:    text-foreground
```

### Badges
```
Success: bg-success/13 text-success rounded-full px-3 py-1 text-xs font-medium
Warning: bg-warning/13 text-warning rounded-full px-3 py-1 text-xs font-medium
Error:   bg-destructive/13 text-destructive rounded-full px-3 py-1 text-xs font-medium
Info:    bg-info/13 text-info rounded-full px-3 py-1 text-xs font-medium
Primary: bg-primary/13 text-primary rounded-full px-3 py-1 text-xs font-medium
```

### Dialogs / Modals
```
Overlay:   bg-black/60 backdrop-blur-sm
Container: bg-card border border-border rounded-[28px] p-6 shadow-2xl
Animation: Animate-UI scale + fade
Focus:     Trap focus, Escape to close
```

### Sidebar
```
Collapsed: w-14 (56px), icon-only
Expanded:  w-60 (240px), icon + labels
Background: hsl(var(--card) / 0.88) backdrop-blur-[14px] border-r border-border
Active:    bg-primary/18 border border-primary/35 text-white rounded-2xl
Inactive:  text-muted-foreground hover:bg-secondary rounded-2xl
Toggle:    Cmd+B
```

## Accessibility Checklist

- [ ] Text contrast >= 4.5:1 (normal), >= 3:1 (large)
- [ ] Visible focus rings (2px primary ring) on all interactive elements
- [ ] aria-label on icon-only buttons
- [ ] Tab order matches visual layout
- [ ] `prefers-reduced-motion` supported
- [ ] Visible labels on all form fields
- [ ] Error messages near related field
- [ ] Color never sole indicator (paired with icon/text)
- [ ] Full keyboard nav (Tab, Arrow, Enter, Escape)
- [ ] Focus moves to content on route change

## Anti-Patterns — DO NOT USE

- No pure `#000000` backgrounds (OLED smear) — use `#09090b`
- No blur on all surfaces — only sidebar/header
- No neon glow — only status dots
- No animations > 500ms
- No emojis as icons — Lucide SVG only
- No placeholder-only labels
- No gray-on-gray text — maintain 4.5:1 contrast
- No horizontal scroll
- No layout-shifting animations
- No decorative continuous animations
- No missing cursor:pointer on clickable elements
- No instant state changes — always transition 150-300ms
