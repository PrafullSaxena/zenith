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
        key: 'bitbucketWorkspace',
        label: 'Bitbucket Workspace',
        type: 'text',
        description: 'Your Bitbucket workspace slug',
        defaultValue: '',
        required: true,
        placeholder: 'my-workspace'
      },
      {
        key: 'repositorySlug',
        label: 'Repository Slug',
        type: 'text',
        description: 'The repository slug to review PRs from',
        defaultValue: '',
        required: true,
        placeholder: 'my-repo'
      },
      {
        key: 'bitbucketClientId',
        label: 'Bitbucket OAuth Client ID',
        type: 'text',
        description: 'OAuth consumer client ID from Bitbucket workspace settings',
        defaultValue: '',
        required: true,
        placeholder: 'your-client-id'
      },
      {
        key: 'bitbucketClientSecret',
        label: 'Bitbucket OAuth Client Secret',
        type: 'password',
        description: 'OAuth consumer client secret (stored securely)',
        defaultValue: '',
        required: true,
        placeholder: 'your-client-secret'
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
    component: React.lazy(() => import('./stubs/DbInspectorView')),
    settingsSchema: [
      {
        key: 'connectionString',
        label: 'Connection String',
        type: 'password',
        description: 'Database connection string (stored securely)',
        defaultValue: '',
        required: true,
        placeholder: 'postgresql://user:pass@host:5432/db'
      },
      {
        key: 'defaultSchema',
        label: 'Default Schema',
        type: 'text',
        description: 'Default schema to browse',
        defaultValue: 'public',
        placeholder: 'public'
      }
    ],
    defaultAgent: null
  },
  {
    id: 'astro-patch',
    name: 'AstroPatch',
    description: 'AI-powered patch generation with Jira integration',
    icon: 'Wrench',
    route: '/astro-patch',
    component: React.lazy(() => import('./stubs/AstroPatchView')),
    settingsSchema: [
      {
        key: 'jiraProjectKey',
        label: 'Jira Project Key',
        type: 'text',
        description: 'Jira project key for issue linking',
        defaultValue: '',
        required: true,
        placeholder: 'PROJ'
      },
      {
        key: 'autoCreateBranch',
        label: 'Auto-create Branch',
        type: 'boolean',
        description: 'Automatically create a Git branch for each patch',
        defaultValue: false
      }
    ],
    defaultAgent: null
  },
  {
    id: 'prompt-builder',
    name: 'PromptBuilder',
    description: 'Prompt construction and template management',
    icon: 'MessageSquare',
    route: '/prompt-builder',
    component: React.lazy(() => import('./stubs/PromptBuilderView')),
    settingsSchema: [
      {
        key: 'templatesDirectory',
        label: 'Templates Directory',
        type: 'text',
        description: 'Path to the prompt templates directory',
        defaultValue: '',
        placeholder: '/path/to/templates'
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
