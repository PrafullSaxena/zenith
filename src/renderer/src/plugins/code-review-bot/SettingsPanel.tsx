interface SettingsPanelProps {
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  isConnecting: boolean
  connectionError: string | null
}

/**
 * Inline settings panel for quick Bitbucket connection management.
 * Shows connection status, connect/disconnect controls, and error messages.
 */
export function SettingsPanel({
  isConnected,
  onConnect,
  onDisconnect,
  isConnecting,
  connectionError
}: SettingsPanelProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {/* Connection status indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            isConnected
              ? 'bg-green-400'
              : connectionError
                ? 'bg-red-400'
                : 'bg-text-secondary'
          }`}
        />
        <span className="text-xs text-text-secondary">
          {isConnected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {/* Connect / Disconnect button */}
      {isConnecting ? (
        <span className="text-xs text-text-secondary">Connecting...</span>
      ) : isConnected ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="rounded px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
        >
          Disconnect
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="rounded bg-accent/10 px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
        >
          Connect to Bitbucket
        </button>
      )}

      {/* Error message */}
      {connectionError && !isConnected && (
        <span className="max-w-xs truncate text-[11px] text-red-400" title={connectionError}>
          {connectionError}
        </span>
      )}

      {/* Hint text — only show when no error */}
      {!connectionError && !isConnected && (
        <span className="hidden text-[11px] text-text-secondary lg:inline">
          Configure OAuth credentials in Settings &gt; CodeReviewBot
        </span>
      )}
    </div>
  )
}
