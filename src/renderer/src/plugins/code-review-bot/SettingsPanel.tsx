import { GlassBadge, GlassButton } from '../../components/ui'

interface SettingsPanelProps {
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  isConnecting: boolean
  connectionError: string | null
}

/**
 * Inline settings panel for quick Bitbucket connection management.
 * Shows connection status via GlassBadge, connect/disconnect GlassButtons,
 * and error messages.
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
      <GlassBadge variant={isConnected ? 'success' : connectionError ? 'error' : 'default'}>
        <span
          className={`inline-block h-2 w-2 rounded-full mr-1.5 ${
            isConnected
              ? 'bg-green-400'
              : connectionError
                ? 'bg-red-400'
                : 'bg-text-secondary'
          }`}
        />
        {isConnected ? 'Connected' : 'Not connected'}
      </GlassBadge>

      {/* Connect / Disconnect button */}
      {isConnecting ? (
        <span className="text-xs text-text-secondary">Connecting...</span>
      ) : isConnected ? (
        <GlassButton variant="ghost" size="sm" onClick={onDisconnect}>
          Disconnect
        </GlassButton>
      ) : (
        <GlassButton variant="primary" size="sm" onClick={onConnect}>
          Connect to Bitbucket
        </GlassButton>
      )}

      {/* Error message */}
      {connectionError && !isConnected && (
        <span className="max-w-xs truncate text-[11px] text-red-400" title={connectionError}>
          {connectionError}
        </span>
      )}

      {/* Hint text -- only show when no error */}
      {!connectionError && !isConnected && (
        <span className="hidden text-[11px] text-text-secondary lg:inline">
          Configure OAuth credentials in Settings &gt; CodeReviewBot
        </span>
      )}
    </div>
  )
}
