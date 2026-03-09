import type { ComponentType, LazyExoticComponent } from 'react'

/**
 * String literal union of all compiled-in plugin identifiers.
 * Used to enforce type-safe plugin references throughout the app.
 */
export type PluginId = 'code-review-bot' | 'db-inspector' | 'astro-patch' | 'prompt-builder' | 'launchpad' | 'nebula'

/**
 * Supported field types for plugin settings forms.
 */
export type SettingsFieldType = 'text' | 'number' | 'boolean' | 'select' | 'password' | 'repo-list' | 'connection-list' | 'textarea' | 'directory'

/**
 * Describes a single settings field for plugin-specific configuration.
 * Used by the settings UI to render per-plugin settings sections.
 */
export interface SettingsField {
  key: string
  label: string
  type: SettingsFieldType
  description?: string
  defaultValue: unknown
  required?: boolean
  options?: { label: string; value: string }[] // for 'select' type
  placeholder?: string
  validate?: (value: unknown) => string | null // returns error message or null
}

/**
 * Core plugin registration type. Each compiled-in plugin is described
 * by a PluginDefinition that drives sidebar icons, React Router routes,
 * settings sections, and agent configuration.
 */
export interface PluginDefinition {
  id: PluginId
  name: string // Display name (e.g., "CodeReviewBot")
  description: string // Short description for tooltips
  icon: string // Lucide icon name (e.g., "GitPullRequest")
  route: string // React Router path (e.g., "/code-review-bot")
  component: LazyExoticComponent<ComponentType> // Lazy-loaded view
  settingsSchema: SettingsField[] // Plugin-specific settings fields
  defaultAgent: string | null // Default AI agent provider id, null = user must pick
}
