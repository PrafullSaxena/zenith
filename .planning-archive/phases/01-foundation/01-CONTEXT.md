# Phase 1: Foundation — Context

User decisions captured via /gsd:discuss-phase. These are LOCKED — do not change without user approval.

## Sidebar & Navigation

- **Width:** ~56px narrow icon rail
- **Layout:** Plugin icons stacked at top, settings gear icon at bottom
- **Behavior:** Hover shows tooltip with plugin name
- **Active indicator:** Left accent border on active icon
- **Plugin order:** CodeReviewBot, DbInspector, AstroPatch, PromptBuilder (top to bottom)
- **Bottom icons:** Settings gear

## Theme & Visual Design

- **Mode:** Dark-only — no light mode, no toggle. `class="dark"` on `<html>` unconditionally.
- **Background:** oklch(10% 0 0) = #0f0f0f
- **Surface:** oklch(14% 0 0) for cards/panels
- **Surface elevated:** oklch(18% 0 0) for modals/dropdowns
- **Border:** oklch(20% 0 0)
- **Accent:** oklch(72% 0.15 195) — neon cyan ~#00d4d4
- **Accent usage:** Active sidebar indicator, primary buttons, links, focus rings
- **Text primary:** oklch(90% 0 0)
- **Text secondary:** oklch(55% 0 0)
- **Spacing:** Comfortable (not cramped) — 16px padding in content areas
- **Font:** Inter Variable, with system-ui fallback
- **Border radius:** 0.5rem default

## Settings Layout

- **Access:** Gear icon in sidebar bottom
- **Layout:** Left sidebar listing settings categories + right content panel
- **Categories:**
  - General (app-level settings)
  - AI Agents (central configuration)
  - Per-plugin sections (each plugin has its own section)
- **Behavior:** Auto-save on change — no explicit save button
- **Validation:** Inline validation with error messages below fields
- **Plugin settings:** Nested under plugin name in settings sidebar

## AI Agent Configuration

- **Providers:** Pre-listed: Claude, Gemini, Codex, Opencode, Ollama, Cursor-agent
- **Custom providers:** "Add Custom" button to add unlisted providers
- **Central view:** Table showing all providers with columns: Name, Type, Status (dot), Actions
- **Per-plugin:** Dropdown in each plugin's settings section to select default agent
- **Test connection:** Button per provider row → shows green dot (connected), red dot (failed), gray dot (not configured)
- **Ollama:** Auto-detect via localhost probe (app:probeOllama IPC channel)
- **Credential storage:** API keys stored via safeStorage in main process, never exposed to renderer
- **Custom provider form:** Inline form in AI Agents table — fields: Name, Base URL, API Key, Model
