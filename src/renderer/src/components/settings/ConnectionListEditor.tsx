import { useState } from 'react'
import {
  Plus,
  Trash2,
  Plug,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import type { DbConnection, ReadStrategy } from '../../types/database'

/** Stored connection entry (same as DbConnection but kept flat for settings). */
export interface ConnectionEntry {
  id: string
  name: string
  host: string
  port: number
  username: string
  database: string
  defaultSchema: string
  readStrategy: ReadStrategy
}

interface ConnectionListEditorProps {
  value: ConnectionEntry[]
  onChange: (connections: ConnectionEntry[]) => void
}

const inputClass =
  'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition'

const selectClass =
  'w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition appearance-none'

/**
 * Editable list of PostgreSQL database connections.
 * Used in the DbInspector settings to configure multiple database connections.
 * Passwords are stored encrypted in the main process via safeStorage.
 */
export function ConnectionListEditor({
  value,
  onChange
}: ConnectionListEditorProps): React.JSX.Element {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState(5432)
  const [username, setUsername] = useState('postgres')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [readStrategy, setReadStrategy] = useState<ReadStrategy>('read-only')
  const [isAdding, setIsAdding] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    serverVersion?: string
    error?: string
  } | null>(null)
  const [error, setError] = useState('')

  const connections = Array.isArray(value) ? value : []

  const resetForm = (): void => {
    setName('')
    setHost('localhost')
    setPort(5432)
    setUsername('postgres')
    setPassword('')
    setShowPassword(false)
    setReadStrategy('read-only')
    setTestResult(null)
    setError('')
  }

  const handleAdd = async (): Promise<void> => {
    const trimmedName = name.trim()
    const trimmedHost = host.trim()
    const trimmedUsername = username.trim()

    if (!trimmedName || !trimmedHost || !trimmedUsername) {
      setError('Name, host, and username are required')
      return
    }

    // Check for duplicate names
    const isDuplicate = connections.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (isDuplicate) {
      setError('A connection with this name already exists')
      return
    }

    setIsAdding(true)
    try {
      const id = `conn-${Date.now()}`
      const conn: ConnectionEntry = {
        id,
        name: trimmedName,
        host: trimmedHost,
        port,
        username: trimmedUsername,
        database: 'postgres',
        defaultSchema: 'public',
        readStrategy
      }

      // Store password securely in main process (encrypted via safeStorage)
      await window.api.db.storeCredentials(id, password)

      onChange([...connections, conn])
      resetForm()
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add connection')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = (index: number): void => {
    const updated = connections.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleTest = async (): Promise<void> => {
    const trimmedHost = host.trim()
    const trimmedUsername = username.trim()
    if (!trimmedHost || !trimmedUsername) return

    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.db.testConnection({
        host: trimmedHost,
        port,
        username: trimmedUsername,
        password
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Connection test failed'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Existing connections list */}
      {connections.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-elevated/50">
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                  Host
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                  Port
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                  Mode
                </th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {connections.map((conn, index) => (
                <tr
                  key={conn.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="px-3 py-2 text-text-primary font-medium">{conn.name}</td>
                  <td className="px-3 py-2 text-text-secondary truncate max-w-[200px]">
                    {conn.host}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{conn.port}</td>
                  <td className="px-3 py-2 text-text-secondary">{conn.readStrategy}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="text-text-secondary transition hover:text-red-400"
                      title="Remove connection"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {connections.length === 0 && !showForm && (
        <div className="rounded-md border border-dashed border-border px-4 py-3 text-center text-xs text-text-secondary">
          No connections configured. Add one below.
        </div>
      )}

      {/* Add connection form */}
      {showForm && (
        <div className="rounded-md border border-border bg-surface-elevated/30 p-4 space-y-3">
          <input
            type="text"
            className={inputClass}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Connection name (e.g. Production DB)"
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Host</label>
              <input
                type="text"
                className={inputClass}
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="localhost or db.example.com"
              />
            </div>
            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Port</label>
              <input
                type="number"
                className={inputClass}
                value={port}
                onChange={(e) => setPort(Number(e.target.value) || 5432)}
                placeholder="5432"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Username</label>
              <input
                type="text"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="postgres"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`${inputClass} pr-10`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Access Mode
            </label>
            <select
              className={selectClass}
              value={readStrategy}
              onChange={(e) => setReadStrategy(e.target.value as ReadStrategy)}
            >
              <option value="read-only">Read-only</option>
              <option value="read-write">Read-write</option>
            </select>
          </div>

          {/* Test result */}
          {testResult && (
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                testResult.success
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              {testResult.success ? (
                <>
                  <CheckCircle2 size={14} />
                  Connected — PostgreSQL {testResult.serverVersion}
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  {testResult.error}
                </>
              )}
            </div>
          )}

          {/* Error */}
          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={!host.trim() || !username.trim() || isTesting}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plug size={13} />
              )}
              Test
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim() || !host.trim() || !username.trim() || isAdding}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-background hover:bg-accent/90 transition disabled:opacity-50"
            >
              {isAdding ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Plus size={13} />
              )}
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Show form button */}
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-[38px] items-center gap-1 rounded-md bg-accent px-3 text-sm font-medium text-background transition hover:bg-accent/90"
        >
          <Plus size={14} />
          Add Connection
        </button>
      )}
    </div>
  )
}
