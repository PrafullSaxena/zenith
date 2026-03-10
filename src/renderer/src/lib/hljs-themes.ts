/**
 * Pre-imported highlight.js theme CSS strings.
 * Static imports so Vite can resolve them in both dev and production.
 * Each CSS file is ~1-3KB — total ~40KB, negligible for Electron.
 */
import githubDark from 'highlight.js/styles/github-dark.min.css?inline'
import githubDarkDimmed from 'highlight.js/styles/github-dark-dimmed.min.css?inline'
import atomOneDark from 'highlight.js/styles/atom-one-dark.min.css?inline'
import monokai from 'highlight.js/styles/monokai.min.css?inline'
import monokaiSublime from 'highlight.js/styles/monokai-sublime.min.css?inline'
import nord from 'highlight.js/styles/nord.min.css?inline'
import tokyoNightDark from 'highlight.js/styles/tokyo-night-dark.min.css?inline'
import nightOwl from 'highlight.js/styles/night-owl.min.css?inline'
import obsidian from 'highlight.js/styles/obsidian.min.css?inline'
import vs2015 from 'highlight.js/styles/vs2015.min.css?inline'
import rosePine from 'highlight.js/styles/rose-pine.min.css?inline'
import rosePineMoon from 'highlight.js/styles/rose-pine-moon.min.css?inline'
import pandaSyntaxDark from 'highlight.js/styles/panda-syntax-dark.min.css?inline'
import shadesOfPurple from 'highlight.js/styles/shades-of-purple.min.css?inline'
import a11yDark from 'highlight.js/styles/a11y-dark.min.css?inline'
import agate from 'highlight.js/styles/agate.min.css?inline'
import anOldHope from 'highlight.js/styles/an-old-hope.min.css?inline'
import tomorrowNightBright from 'highlight.js/styles/tomorrow-night-bright.min.css?inline'
import srcery from 'highlight.js/styles/srcery.min.css?inline'

export const HLJS_THEME_CSS: Record<string, string> = {
  'github-dark': githubDark,
  'github-dark-dimmed': githubDarkDimmed,
  'atom-one-dark': atomOneDark,
  'monokai': monokai,
  'monokai-sublime': monokaiSublime,
  'nord': nord,
  'tokyo-night-dark': tokyoNightDark,
  'night-owl': nightOwl,
  'obsidian': obsidian,
  'vs2015': vs2015,
  'rose-pine': rosePine,
  'rose-pine-moon': rosePineMoon,
  'panda-syntax-dark': pandaSyntaxDark,
  'shades-of-purple': shadesOfPurple,
  'a11y-dark': a11yDark,
  'agate': agate,
  'an-old-hope': anOldHope,
  'tomorrow-night-bright': tomorrowNightBright,
  'srcery': srcery
}
