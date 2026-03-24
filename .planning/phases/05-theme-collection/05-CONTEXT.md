# Phase 5: Theme Collection - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Define 6 new dark themes, convert all 12 legacy themes from hex to OKLch, enhance the visual theme selector grid in Settings, and validate glass components render correctly across all 18 themes. No component changes — only CSS theme definitions, theme metadata, and the selector UI enhancement.

</domain>

<decisions>
## Implementation Decisions

### New Theme Design Philosophy
- **Primary goal**: Themes optimized for high-volume reading and writing — ease of use, clean, glossy, futuristic, **no eye strain**
- **Controlled saturation**: Accent colors should be vivid enough to be distinctive but not fatiguing during extended sessions
- **Sufficient contrast**: Text must be highly readable. Background-to-text contrast ratio should exceed WCAG AA (4.5:1)
- **Glass compatibility**: Every theme must look good with glass surfaces (backdrop-blur, border opacity, accent glow)

### New Theme Palettes

#### Midnight Bloom
- Vibe: Orchid petals glowing in darkness — but restrained for comfort
- Background: Deep violet-black (low lightness, low chroma)
- Accent: Magenta-orchid — saturated enough to glow, not enough to fatigue
- Surfaces: Shift from cool violet to warm purple undertones

#### Copper Forge
- Vibe: Warm industrial — polished copper pipes, workshop lighting
- Background: Warm charcoal-brown
- Accent: Burnished copper/orange — warm metallic feel
- Claude's discretion on exact copper tone

#### Ocean Depth
- Vibe: Deep sea bioluminescent — very dark with glowing teal
- Background: Abyssal navy-black (nearly black with blue undertone)
- Accent: Aquamarine/teal — bioluminescent glow
- Claude's discretion on depth vs brightness balance

#### Nebula Dust
- Vibe: Hubble nebula photos — pink-coral wisps against space
- Background: Deep space purple-black
- Accent: Stellar pink-coral — ethereal and cosmic
- Claude's discretion on warmth level

#### Obsidian
- Vibe: Pure monochrome editorial — zero saturation, sharp contrast
- Background: True near-black (oklch ~10% lightness, 0 chroma)
- Accent: Pure white/silver (oklch ~65% lightness, 0 chroma)
- High contrast for focused writing. Crisp, editorial feel.

#### Jade Temple
- Vibe: Natural jade, zen, serene, organic
- Background: Very dark forest green
- Accent: Muted emerald-jade — low saturation for comfort
- Natural, organic feel without being overwhelming

### OKLch Legacy Conversion
- **Conversion fidelity**: Claude's discretion — preserve visual appearance or allow subtle improvements for better perceptual uniformity
- **Batch approach**: All 12 legacy themes converted in a single atomic commit
- **Glass-glow overrides**: Keep current Phase 1 values unchanged during conversion. Don't re-tune.
- **Format**: All color values converted from hex/rgb to oklch() notation

### Theme Selector Grid Enhancement
- **Mini glass preview**: Below the 4 color dots, add a tiny ~80px-wide strip simulating a glass card on that theme's background. Shows how glass surfaces actually look.
- **Theme switch animation**: Smooth color crossfade (~300ms) via CSS transition on all color variables. Colors morph when switching.
- **New badge**: Small 'NEW' GlassBadge on new theme cards (the 6 new ones). Accent-colored, draws attention.
- **Existing decisions preserved from Phase 3**: 3-column grid, name + 4 color dots, "Classic Themes" / "New Collection" section headers, accent border glow on active theme with check icon

### Cross-Theme QA
- All 18 themes must pass visual QA:
  - Glass cards visible and readable
  - Accent glow visible but not overpowering
  - Text contrast sufficient for extended reading
  - No color clashing between glass borders and theme backgrounds
  - GlassBadge colors (success/error/warning/info) distinguishable on every theme

### Claude's Discretion
- Exact OKLch values for all 22 CSS variables per new theme
- Whether to allow subtle color improvements during legacy conversion or keep strict visual match
- Exact mini glass preview implementation (CSS-only or tiny rendered component)
- Whether the crossfade transition applies to all CSS vars or only color-related ones
- How to handle themes where glass-glow might be too subtle or too strong

</decisions>

<specifics>
## Specific Ideas

- The new themes should feel like they belong in a premium developer tool — each distinctive but not gimmicky
- Obsidian (monochrome) should feel like a high-end code editor or editorial tool — think iA Writer meets VS Code
- The mini glass preview in the selector should give users an instant feel for "how will this look?" before clicking
- Theme crossfade animation should feel smooth and intentional, like macOS dark mode transition

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-theme-collection*
*Context gathered: 2026-03-25*
