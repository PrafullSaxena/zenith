/**
 * Health monitoring store — aggregates health status from all resource types.
 *
 * Reads from agent-store (AI providers), db-store (database connections),
 * and settings (MCP servers) to produce a unified list of ResourceHealth entries.
 * Extensible: add a new ResourceCategory and mapping function to include new resources.
 */

import { create } from 'zustand'
import type { ResourceHealth, HealthStatus, ResourceCategory } from '../types/health'
import type { MCPServerConfig } from '../types/mcp'
import { useAgentStore } from './agent-store'
import { useDbStore } from './db-store'

interface HealthStoreState {
  resources: ResourceHealth[]
  isLoading: boolean

  /** Re-read current state from all source stores and rebuild the resources list. */
  refreshHealth: () => Promise<void>

  /** Filter resources by category. */
  getByCategory: (category: ResourceCategory) => ResourceHealth[]

  /** Return the worst health status across all resources. */
  overallStatus: () => HealthStatus
}

const STATUS_PRIORITY: Record<HealthStatus, number> = {
  unhealthy: 0,
  degraded: 1,
  unknown: 2,
  healthy: 3
}

export const useHealthStore = create<HealthStoreState>((set, get) => ({
  resources: [],
  isLoading: false,

  refreshHealth: async () => {
    set({ isLoading: true })
    const now = new Date().toISOString()
    const resources: ResourceHealth[] = []

    // ── Re-probe agents (CLI binaries, API keys) for fresh status ──
    try {
      await useAgentStore.getState().loadProviders()
    } catch { /* probe failed — we'll still read cached state below */ }

    // ── AI Agents ──
    const agents = useAgentStore.getState().providers
    for (const agent of agents) {
      let status: HealthStatus = 'unknown'
      if (agent.status === 'connected') status = 'healthy'
      else if (agent.status === 'testing') status = 'degraded'
      else if (agent.status === 'failed') status = 'unhealthy'

      resources.push({
        id: `agent-${agent.id}`,
        name: agent.name,
        category: 'agent',
        status,
        detail:
          agent.status === 'connected'
            ? `${agent.type.toUpperCase()} · Connected`
            : agent.status === 'not-configured'
              ? 'Not configured'
              : agent.status,
        lastChecked: now
      })
    }

    // ── Database Connections ──
    const dbState = useDbStore.getState()
    for (const conn of dbState.connections) {
      const cs = dbState.connectionStatuses[conn.id]
      let status: HealthStatus = 'unknown'
      let detail = 'Disconnected'
      if (cs?.connected) {
        status = 'healthy'
        detail = `${conn.host}:${conn.port} · Connected`
      } else if (cs?.error) {
        status = 'unhealthy'
        detail = cs.error
      }
      resources.push({
        id: `db-${conn.id}`,
        name: conn.name,
        category: 'database',
        status,
        detail,
        lastChecked: now
      })
    }

    // ── MCP Servers ──
    try {
      const mcpServers = (await window.api.settings.get('mcp.servers')) as
        | MCPServerConfig[]
        | null
      if (Array.isArray(mcpServers)) {
        for (const srv of mcpServers) {
          resources.push({
            id: `mcp-${srv.id}`,
            name: srv.name,
            category: 'mcp',
            status: srv.enabled ? 'healthy' : 'unknown',
            detail: srv.enabled ? `${srv.transport.toUpperCase()} · Enabled` : 'Disabled',
            lastChecked: now
          })
        }
      }
    } catch {
      /* MCP settings not yet configured — that's fine */
    }

    set({ resources, isLoading: false })
  },

  getByCategory: (category) => {
    return get().resources.filter((r) => r.category === category)
  },

  overallStatus: () => {
    const all = get().resources
    if (all.length === 0) return 'unknown'
    return all.reduce<HealthStatus>(
      (worst, r) =>
        STATUS_PRIORITY[r.status] < STATUS_PRIORITY[worst] ? r.status : worst,
      'healthy'
    )
  }
}))
