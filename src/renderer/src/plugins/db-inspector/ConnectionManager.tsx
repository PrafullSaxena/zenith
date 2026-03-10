/**
 * ConnectionManager — Select, connect, and disconnect PostgreSQL connections.
 *
 * Connections are added/removed via the Settings page.
 * This component only allows selecting from existing connections and
 * connecting/disconnecting them.
 */
import React from 'react'
import {
  Plug,
  Unplug,
  Loader2,
  Settings
} from 'lucide-react'
import type { DbConnection, ConnectionStatus } from '../../types/database'

interface ConnectionManagerProps {
  connections: DbConnection[]
  connectionStatuses: Record<string, ConnectionStatus>
  activeConnectionId: string | null
  onSelectConnection: (id: string | null) => void
  onConnect: (id: string) => Promise<void>
  onDisconnect: (id: string) => Promise<void>
  onOpenSettings: () => void
}

export default function ConnectionManager({
  connections,
  connectionStatuses,
  activeConnectionId,
  onSelectConnection,
  onConnect,
  onDisconnect,
  onOpenSettings
}: ConnectionManagerProps): React.JSX.Element {
  const activeConnection = connections.find((c) => c.id === activeConnectionId)
  const activeStatus = activeConnectionId ? connectionStatuses[activeConnectionId] : null
  const isConnected = activeStatus?.connected ?? false
  const isConnecting = activeConnectionId
    ? connectionStatuses[activeConnectionId] !== undefined &&
      !connectionStatuses[activeConnectionId]?.connected &&
      !connectionStatuses[activeConnectionId]?.error
    : false

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          Connection
        </h3>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-accent"
          title="Manage connections in Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Connection selector */}
      {connections.length === 0 ? (
        <div className="space-y-2">
          <p className="py-2 text-center text-xs text-text-secondary/70">
            No connections configured
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-text-secondary hover:border-accent/50 hover:text-accent transition"
          >
            <Settings size={12} />
            Add in Settings
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Dropdown selector */}
          <select
            value={activeConnectionId ?? ''}
            onChange={(e) => onSelectConnection(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select a connection...</option>
            {connections.map((conn) => {
              const status = connectionStatuses[conn.id]
              const connected = status?.connected ?? false
              return (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.host}:{conn.port}){connected ? ' [connected]' : ''}
                </option>
              )
            })}
          </select>

          {/* Selected connection info + actions */}
          {activeConnection && (
            <div className="space-y-2">
              {/* Connection info */}
              <div className="rounded-lg border border-border bg-surface-elevated/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isConnected
                        ? 'bg-success'
                        : activeStatus?.error
                          ? 'bg-error'
                          : isConnecting
                            ? 'bg-warning animate-status-pulse'
                            : 'bg-text-secondary/30'
                    }`}
                  />
                  <span className="text-xs font-medium text-text-primary">
                    {activeConnection.name}
                  </span>
                </div>
                <p className="mt-0.5 pl-4 text-[10px] text-text-secondary">
                  {activeConnection.host}:{activeConnection.port} · {activeConnection.username} · {activeConnection.readStrategy}
                </p>
                {activeStatus?.error && (
                  <p className="mt-1 pl-4 text-[10px] text-red-400">{activeStatus.error}</p>
                )}
              </div>

              {/* Connect / Disconnect button */}
              {isConnected ? (
                <button
                  type="button"
                  onClick={() => onDisconnect(activeConnection.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-orange-400/50 hover:text-orange-400 transition"
                >
                  <Unplug size={12} />
                  Disconnect
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onConnect(activeConnection.id)}
                  disabled={isConnecting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 transition disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plug size={12} />
                  )}
                  Connect
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
