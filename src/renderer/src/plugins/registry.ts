import React from 'react'
import type { PluginDefinition, PluginId } from '../types/plugin'

/**
 * Compiled-in plugin registry. This array is the single source of truth
 * that drives sidebar icons, React Router routes, settings sections,
 * and per-plugin agent configuration.
 *
 * Order determines sidebar display order (top to bottom).
 */
export const PLUGINS: readonly PluginDefinition[] = [
  {
    id: 'code-review-bot',
    name: 'CodeReviewBot',
    description: 'Automated Bitbucket PR code review with AI-generated inline comments',
    icon: 'GitPullRequest',
    route: '/code-review-bot',
    component: React.lazy(() => import('./code-review-bot/CodeReviewBotView')),
    settingsSchema: [
      {
        key: 'repos',
        label: 'Repositories',
        type: 'repo-list',
        description: 'Bitbucket workspace + repository pairs to review PRs from',
        defaultValue: [],
        required: true
      },
      {
        key: 'bitbucketUsername',
        label: 'Bitbucket Username',
        type: 'text',
        description: 'Your Bitbucket username or email (used for App Password auth)',
        defaultValue: '',
        required: true,
        placeholder: 'user@example.com'
      },
      {
        key: 'bitbucketAppPassword',
        label: 'Bitbucket App Password',
        type: 'password',
        description: 'App password from Bitbucket > Personal settings > App passwords',
        defaultValue: '',
        required: true,
        placeholder: 'your-app-password'
      },
      {
        key: 'reviewGuidelines',
        label: 'Review Guidelines',
        type: 'textarea',
        description: 'Markdown guidelines for AI code review. Include repo-specific rules, coding standards, and focus areas.',
        defaultValue: '',
        placeholder: '# Code Review Guidelines\n\n## Code Quality\n- Check for proper error handling\n- Verify logging is present\n- Look for security vulnerabilities\n\n## Best Practices\n- Functions should have single responsibilities\n- Use meaningful variable names'
      },
      {
        key: 'autoReview',
        label: 'Auto-review PRs',
        type: 'boolean',
        description: 'Automatically review new pull requests',
        defaultValue: false
      }
    ],
    defaultAgent: null
  },
  {
    id: 'db-inspector',
    name: 'DbInspector',
    description: 'Database inspection and query tooling',
    icon: 'Database',
    route: '/db-inspector',
    component: React.lazy(() => import('./db-inspector/DbInspectorView')),
    settingsSchema: [
      {
        key: 'connections',
        label: 'Database Connections',
        type: 'connection-list',
        description: 'PostgreSQL database connections (managed in-app)',
        defaultValue: [],
        required: true
      }
    ],
    defaultAgent: null
  },
  {
    id: 'launchpad',
    name: 'Launchpad',
    description: 'Cloud cost estimation with AI-powered recommendations',
    icon: 'Rocket',
    route: '/launchpad',
    component: React.lazy(() => import('./launchpad/LaunchpadView')),
    settingsSchema: [],
    defaultAgent: null
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Notes & knowledge management with AI-powered summarization',
    icon: 'BookOpen',
    route: '/nebula',
    component: React.lazy(() => import('./nebula/NebulaView')),
    settingsSchema: [
      {
        key: 'storagePath',
        label: 'Storage Directory',
        type: 'directory',
        description:
          'Directory where notes and database are stored. Defaults to app data folder if empty.',
        defaultValue: '',
        placeholder: '/path/to/nebula-notes'
      },
      {
        key: 'autoGenerateTitle',
        label: 'Auto-generate Note Title',
        type: 'boolean',
        description:
          'When enabled, the AI agent automatically generates a note title from the content during summarization.',
        defaultValue: true
      }
    ],
    defaultAgent: null
  },
  {
    id: 'textcraft',
    name: 'TextCraft',
    description: 'AI-powered text refinement with tone and format controls',
    icon: 'PenLine',
    route: '/textcraft',
    component: React.lazy(() => import('./textcraft/TextCraftView')),
    settingsSchema: [
      {
        key: 'defaultTone',
        label: 'Default Tone',
        type: 'select',
        description: 'Default writing tone for new refinements',
        defaultValue: 'professional',
        options: [
          { label: 'Professional', value: 'professional' },
          { label: 'Casual', value: 'casual' },
          { label: 'Technical', value: 'technical' },
          { label: 'Friendly', value: 'friendly' },
          { label: 'Concise', value: 'concise' },
          { label: 'Instructive', value: 'instructive' }
        ]
      },
      {
        key: 'defaultFormat',
        label: 'Default Format',
        type: 'select',
        description: 'Default output format for new refinements',
        defaultValue: 'email',
        options: [
          { label: 'Email', value: 'email' },
          { label: 'One-Pager', value: 'one-pager' },
          { label: 'Technical Doc', value: 'technical-doc' },
          { label: 'RCA', value: 'rca' },
          { label: 'General', value: 'general' },
          { label: 'Prompt', value: 'prompt' }
        ]
      }
    ],
    defaultAgent: null
  }
] as const

/**
 * Find a plugin by its ID. Returns undefined if not found.
 */
export function getPluginById(id: PluginId): PluginDefinition | undefined {
  return PLUGINS.find((plugin) => plugin.id === id)
}
