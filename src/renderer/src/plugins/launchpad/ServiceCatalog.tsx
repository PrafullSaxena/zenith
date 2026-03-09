/**
 * ServiceCatalog — Stub placeholder.
 * Full implementation in Plan 03, Task 2.
 */
import type { CloudProvider } from '../../types/launchpad'

interface ServiceCatalogProps {
  provider: CloudProvider
}

export default function ServiceCatalog({ provider: _provider }: ServiceCatalogProps): React.JSX.Element {
  return <div className="p-4 text-text-secondary text-sm">Loading catalog...</div>
}
