/**
 * Theme metadata for the Zenith theme selector grid.
 *
 * Color values are extracted from the [data-theme] CSS blocks in main.css.
 * Each entry provides the 4 key colors needed for the theme preview dots.
 */

export interface ThemeMeta {
  value: string
  label: string
  section: 'classic' | 'new'
  colors: {
    bg: string
    surface: string
    accent: string
    text: string
  }
}

export const THEME_METADATA: ThemeMeta[] = [
  // ---------------------------------------------------------------------------
  // Classic themes (12) — colors sourced from main.css [data-theme] blocks
  // ---------------------------------------------------------------------------
  {
    value: 'default',
    label: 'Default',
    section: 'classic',
    colors: {
      bg: 'oklch(10% 0 0)',
      surface: 'oklch(14% 0 0)',
      accent: 'oklch(72% 0.15 195)',
      text: 'oklch(90% 0 0)'
    }
  },
  {
    value: 'portfolio',
    label: 'Portfolio',
    section: 'classic',
    colors: {
      bg: 'oklch(15% 0.03 260)',
      surface: 'oklch(20% 0.03 255)',
      accent: 'oklch(77% 0.17 75)',
      text: 'oklch(96% 0.005 240)'
    }
  },
  {
    value: 'nord',
    label: 'Nord',
    section: 'classic',
    colors: {
      bg: 'oklch(16% 0.02 240)',
      surface: 'oklch(20% 0.02 240)',
      accent: 'oklch(72% 0.12 220)',
      text: 'oklch(92% 0.01 230)'
    }
  },
  {
    value: 'rose-pine',
    label: 'Rose Pine',
    section: 'classic',
    colors: {
      bg: 'oklch(14% 0.02 280)',
      surface: 'oklch(18% 0.02 280)',
      accent: 'oklch(68% 0.14 350)',
      text: 'oklch(88% 0.02 280)'
    }
  },
  {
    value: 'dracula',
    label: 'Dracula',
    section: 'classic',
    colors: {
      bg: 'oklch(16% 0.02 270)',
      surface: 'oklch(20% 0.02 270)',
      accent: 'oklch(65% 0.18 290)',
      text: 'oklch(92% 0.01 270)'
    }
  },
  {
    value: 'gruvbox',
    label: 'Gruvbox',
    section: 'classic',
    colors: {
      bg: 'oklch(15% 0.02 60)',
      surface: 'oklch(19% 0.02 60)',
      accent: 'oklch(72% 0.16 60)',
      text: 'oklch(88% 0.03 80)'
    }
  },
  {
    value: 'tokyo-night',
    label: 'Tokyo Night',
    section: 'classic',
    colors: {
      bg: 'oklch(13% 0.03 260)',
      surface: 'oklch(17% 0.03 260)',
      accent: 'oklch(68% 0.16 265)',
      text: 'oklch(90% 0.01 260)'
    }
  },
  {
    value: 'synthwave',
    label: 'Synthwave',
    section: 'classic',
    colors: {
      bg: 'oklch(12% 0.04 300)',
      surface: 'oklch(16% 0.04 300)',
      accent: 'oklch(68% 0.22 340)',
      text: 'oklch(90% 0.02 300)'
    }
  },
  {
    value: 'catppuccin',
    label: 'Catppuccin',
    section: 'classic',
    colors: {
      bg: 'oklch(15% 0.01 260)',
      surface: 'oklch(19% 0.01 260)',
      accent: 'oklch(72% 0.12 280)',
      text: 'oklch(90% 0.01 270)'
    }
  },
  {
    value: 'emerald',
    label: 'Emerald',
    section: 'classic',
    colors: {
      bg: 'oklch(10% 0.01 155)',
      surface: 'oklch(14% 0.01 155)',
      accent: 'oklch(72% 0.18 155)',
      text: 'oklch(90% 0.01 155)'
    }
  },
  {
    value: 'solarized',
    label: 'Solarized',
    section: 'classic',
    colors: {
      bg: 'oklch(15% 0.03 210)',
      surface: 'oklch(19% 0.03 210)',
      accent: 'oklch(65% 0.12 205)',
      text: 'oklch(85% 0.02 80)'
    }
  },
  {
    value: 'crimson',
    label: 'Crimson',
    section: 'classic',
    colors: {
      bg: 'oklch(11% 0.01 15)',
      surface: 'oklch(15% 0.01 15)',
      accent: 'oklch(62% 0.2 25)',
      text: 'oklch(90% 0.01 30)'
    }
  },

  // ---------------------------------------------------------------------------
  // New themes (6) — colors sourced from main.css [data-theme] blocks
  // ---------------------------------------------------------------------------
  {
    value: 'midnight-bloom',
    label: 'Midnight Bloom',
    section: 'new',
    colors: {
      bg: 'oklch(11% 0.02 300)',
      surface: 'oklch(15% 0.02 300)',
      accent: 'oklch(68% 0.18 330)',
      text: 'oklch(90% 0.01 300)'
    }
  },
  {
    value: 'copper-forge',
    label: 'Copper Forge',
    section: 'new',
    colors: {
      bg: 'oklch(13% 0.02 55)',
      surface: 'oklch(17% 0.02 55)',
      accent: 'oklch(70% 0.14 60)',
      text: 'oklch(90% 0.01 70)'
    }
  },
  {
    value: 'ocean-depth',
    label: 'Ocean Depth',
    section: 'new',
    colors: {
      bg: 'oklch(11% 0.02 245)',
      surface: 'oklch(15% 0.02 245)',
      accent: 'oklch(72% 0.14 190)',
      text: 'oklch(90% 0.01 230)'
    }
  },
  {
    value: 'nebula-dust',
    label: 'Nebula Dust',
    section: 'new',
    colors: {
      bg: 'oklch(12% 0.02 295)',
      surface: 'oklch(16% 0.02 295)',
      accent: 'oklch(70% 0.16 20)',
      text: 'oklch(90% 0.01 295)'
    }
  },
  {
    value: 'obsidian',
    label: 'Obsidian',
    section: 'new',
    colors: {
      bg: 'oklch(10% 0 0)',
      surface: 'oklch(14% 0 0)',
      accent: 'oklch(65% 0 0)',
      text: 'oklch(92% 0 0)'
    }
  },
  {
    value: 'jade-temple',
    label: 'Jade Temple',
    section: 'new',
    colors: {
      bg: 'oklch(12% 0.02 160)',
      surface: 'oklch(16% 0.02 160)',
      accent: 'oklch(65% 0.12 160)',
      text: 'oklch(90% 0.01 155)'
    }
  }
]

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** Returns only the 12 classic themes with complete color data. */
export function getClassicThemes(): ThemeMeta[] {
  return THEME_METADATA.filter((t) => t.section === 'classic')
}

/** Returns the 6 new collection themes. */
export function getNewThemes(): ThemeMeta[] {
  return THEME_METADATA.filter((t) => t.section === 'new')
}
