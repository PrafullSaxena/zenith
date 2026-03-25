/**
 * MCP Servers settings panel.
 * Allows adding, removing, enabling/disabling Model Context Protocol servers.
 * Persists to 'mcp.servers' in settings store.
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Server, ChevronDown, ChevronRight } from 'lucide-react'
import { useSettingsStore } from '../../stores/settings-store'
import { GlassSkeleton } from '../ui'
import type { MCPServerConfig, MCPTransport } from '../../types/mcp'

const MCP_STORAGE_KEY = 'mcp.servers'

export function MCPSettings(): React.JSX.Element {
  const { getSetting, setSetting, loadSettings, isLoading } = useSettingsStore()
  const [servers, setServers] = useState<MCPServerConfig[]>([])
  const [showAddForm, setShowAddForm] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formCommand, setFormCommand] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTransport, setFormTransport] = useState<MCPTransport>('stdio')

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Load servers from settings
  useEffect(() => {
    const raw = getSetting(MCP_STORAGE_KEY)
    if (Array.isArray(raw)) {
      setServers(raw as MCPServerConfig[])
    }
  }, [getSetting])

  const persistServers = useCallback(
    async (updated: MCPServerConfig[]) => {
      setServers(updated)
      await setSetting(MCP_STORAGE_KEY, updated)
    },
    [setSetting]
  )

  const handleAdd = useCallback(async () => {
    if (!formName.trim() || !formCommand.trim()) return

    const newServer: MCPServerConfig = {
      id: `mcp-${Date.now()}`,
      name: formName.trim(),
      command: formCommand.trim(),
      description: formDescription.trim(),
      transport: formTransport,
      enabled: true
    }

    await persistServers([...servers, newServer])
    setFormName('')
    setFormCommand('')
    setFormDescription('')
    setFormTransport('stdio')
    setShowAddForm(false)
  }, [formName, formCommand, formDescription, formTransport, servers, persistServers])

  const handleRemove = useCallback(
    async (id: string) => {
      await persistServers(servers.filter((s) => s.id !== id))
    },
    [servers, persistServers]
  )

  const handleToggle = useCallback(
    async (id: string) => {
      await persistServers(
        servers.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
      )
    },
    [servers, persistServers]
  )

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <GlassSkeleton variant="card" />
        <GlassSkeleton variant="card" />
      </div>
    )
  }

  return (
    <div className="stagger-children">
      <h2 className="mb-1 text-lg font-semibold text-text-primary">MCP Servers</h2>
      <p className="mb-6 text-xs text-text-secondary">
        Configure Model Context Protocol servers for enhanced AI capabilities and tool
        orchestration.
      </p>

      {/* Server list */}
      {servers.length === 0 && !showAddForm && (
        <div className="mb-4 rounded-lg border border-dashed border-border/50 px-4 py-8 text-center">
          <Server size={24} className="mx-auto mb-2 text-text-secondary/30" />
          <p className="text-sm text-text-secondary">No MCP servers configured</p>
          <p className="mt-1 text-xs text-text-secondary">
            Add a server to extend AI capabilities with custom tools and data sources.
          </p>
        </div>
      )}

      {servers.length > 0 && (
        <div className="mb-4 divide-y divide-border/30 rounded-xl border border-border/50">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-elevated/30"
            >
              <Server
                size={14}
                className={server.enabled ? 'text-accent' : 'text-text-secondary/40'}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    server.enabled ? 'text-text-primary' : 'text-text-secondary/60'
                  }`}
                >
                  {server.name}
                </p>
                <p className="truncate text-[11px] text-text-secondary/60">
                  {server.command}
                  {server.description ? ` — ${server.description}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-surface-elevated px-1.5 py-0.5 text-[10px] text-text-secondary">
                {server.transport.toUpperCase()}
              </span>
              {/* Enable/Disable toggle */}
              <button
                type="button"
                onClick={() => handleToggle(server.id)}
                className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                  server.enabled ? 'bg-accent' : 'bg-surface-elevated border border-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-text-primary shadow transition-transform ${
                    server.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(server.id)}
                className="shrink-0 rounded-lg p-1 text-text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
                title="Remove server"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form toggle */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-secondary transition-colors hover:border-accent/30 hover:text-accent"
        >
          <Plus size={13} />
          Add MCP Server
        </button>
      ) : (
        <div className="rounded-xl border border-border/50 bg-surface-elevated/30 p-4">
          <button
            type="button"
            onClick={() => setShowAddForm(false)}
            className="mb-3 flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
          >
            <ChevronDown size={11} />
            Add MCP Server
          </button>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My MCP Server"
                className="w-full rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Command / URL <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                placeholder="npx @modelcontextprotocol/server-name"
                className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Description
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What this server provides…"
                className="w-full rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Transport
              </label>
              <select
                value={formTransport}
                onChange={(e) => setFormTransport(e.target.value as MCPTransport)}
                className="rounded-lg border border-border/50 bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30"
              >
                <option value="stdio">stdio (local process)</option>
                <option value="sse">SSE (remote URL)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!formName.trim() || !formCommand.trim()}
                className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <Plus size={12} />
                Add Server
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 rounded-lg border border-border bg-surface-elevated/30 px-4 py-3">
        <p className="text-[11px] font-medium text-text-secondary">About MCP</p>
        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary/60">
          The Model Context Protocol (MCP) allows AI agents to access external tools, data
          sources, and APIs. Servers can be local processes (stdio) or remote services
          (SSE). Configured servers will be available to AI agents during analysis.
        </p>
      </div>
    </div>
  )
}
