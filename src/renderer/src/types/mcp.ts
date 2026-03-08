/**
 * MCP (Model Context Protocol) server configuration types.
 * Used by the MCP settings panel and health monitoring.
 */

/** Transport mechanism for MCP server communication */
export type MCPTransport = 'stdio' | 'sse'

/** Configuration for a single MCP server */
export interface MCPServerConfig {
  /** Unique identifier, e.g. "mcp-{timestamp}" */
  id: string
  /** Display name */
  name: string
  /** Command to launch (stdio) or URL to connect (sse) */
  command: string
  /** CLI arguments for stdio transport */
  args?: string[]
  /** Human-readable description */
  description: string
  /** Transport type */
  transport: MCPTransport
  /** Whether this server is enabled */
  enabled: boolean
}
