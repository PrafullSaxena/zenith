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
import { Button } from '@renderer/components/ui/button'
import { SimpleSelect } from '@renderer/components/ui/select'

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

  // Build options for Select
  const connectionOptions = connections.map((conn) => {
    const status = connectionStatuses[conn.id]
    const connected = status?.connected ?? false
    return {
      value: conn.id,
      label: `${conn.name} (${conn.host}:${conn.port})${connected ? ' [connected]' : ''}`
    }
  })

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          Connection
        </h3>
        <button
          type="button"
          onClick={onOpenSettings}
          className="rounded p-1 text-[hsl(var(--muted-foreground))] hover:bg-white/[0.04] hover:text-[var(--primary)]"
          title="Manage connections in Settings"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Connection selector */}
      {connections.length === 0 ? (
        <div className="space-y-2">
          <p className="py-2 text-center text-xs text-[hsl(var(--muted-foreground))]/70">
            No connections configured
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[hsl(var(--border))] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] hover:border-[var(--primary)]/50 hover:text-[var(--primary)] transition"
          >
            <Settings size={12} />
            Add in Settings
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Dropdown selector with Select */}
          <SimpleSelect
            value={activeConnectionId ?? ''}
            onChange={(val) => onSelectConnection(val || null)}
            options={[{ value: '', label: 'Select a connection...' }, ...connectionOptions]}
          />

          {/* Selected connection info + actions */}
          {activeConnection && (
            <div className="space-y-2">
              {/* Connection info with status dot */}
              <div className="rounded-lg border border-[hsl(var(--border))] bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isConnected
                        ? 'bg-green-400'
                        : activeStatus?.error
                          ? 'bg-red-400'
                          : isConnecting
                            ? 'bg-yellow-400 animate-pulse'
                            : 'bg-[hsl(var(--muted-foreground))]/30'
                    }`}
                  />
                  <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                    {activeConnection.name}
                  </span>
                </div>
                <p className="mt-0.5 pl-4 text-[10px] text-[hsl(var(--muted-foreground))]">
                  {activeConnection.host}:{activeConnection.port} · {activeConnection.username} · {activeConnection.readStrategy}
                </p>
                {activeStatus?.error && (
                  <p className="mt-1 pl-4 text-[10px] text-red-400">{activeStatus.error}</p>
                )}
              </div>

              {/* Connect / Disconnect button */}
              {isConnected ? (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onDisconnect(activeConnection.id)}
                >
                  <Unplug size={12} />
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => onConnect(activeConnection.id)}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plug size={12} />
                  )}
                  Connect
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
