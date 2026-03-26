import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'

interface SettingsPanelProps {
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  isConnecting: boolean
  connectionError: string | null
}

/**
 * Inline settings panel for quick Bitbucket connection management.
 * Shows connection status via Badge, connect/disconnect Buttons,
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
      <Badge variant={isConnected ? 'success' : connectionError ? 'error' : 'default'}>
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
      </Badge>

      {/* Connect / Disconnect button */}
      {isConnecting ? (
        <span className="text-xs text-muted-foreground">Connecting...</span>
      ) : isConnected ? (
        <Button variant="ghost" size="sm" onClick={onDisconnect}>
          Disconnect
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={onConnect}>
          Connect to Bitbucket
        </Button>
      )}

      {/* Error message */}
      {connectionError && !isConnected && (
        <span className="max-w-xs truncate text-[11px] text-red-400" title={connectionError}>
          {connectionError}
        </span>
      )}

      {/* Hint text -- only show when no error */}
      {!connectionError && !isConnected && (
        <span className="hidden text-[11px] text-muted-foreground lg:inline">
          Configure OAuth credentials in Settings &gt; CodeReviewBot
        </span>
      )}
    </div>
  )
}
