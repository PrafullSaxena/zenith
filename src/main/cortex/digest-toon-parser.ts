/**
 * digest-toon-parser.ts — Parses AI-generated digest TOON output into structured data.
 * Extended TOON format with DIGEST_* record types.
 */

export interface DigestMeta {
  architecture: string
  entryPoints: number
  layers: number
}

export interface DigestEntity {
  id: string
  correctedKind: string
  name: string
  importance: 'high' | 'medium' | 'low'
  summary: string
}

export interface DigestMissingEdge {
  fromEntity: string
  toEntity: string
  reason: string
}

export interface DigestCorrection {
  entityId: string
  field: string
  oldValue: string
  newValue: string
  reason: string
}

export interface DigestPattern {
  name: string
  entities: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface DigestBoundary {
  name: string
  entities: string[]
}

export interface ParsedDigest {
  meta: DigestMeta | null
  entities: DigestEntity[]
  missingEdges: DigestMissingEdge[]
  corrections: DigestCorrection[]
  patterns: DigestPattern[]
  boundaries: DigestBoundary[]
}

export function parseDigestToon(text: string): ParsedDigest {
  const result: ParsedDigest = {
    meta: null,
    entities: [],
    missingEdges: [],
    corrections: [],
    patterns: [],
    boundaries: []
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    const parts = line.split('|')
    const type = (parts[0] ?? '').toUpperCase()

    switch (type) {
      case 'DIGEST_META': {
        const props = parseKeyValueParts(parts.slice(1))
        result.meta = {
          architecture: props.architecture ?? '',
          entryPoints: parseInt(props.entryPoints ?? '0', 10),
          layers: parseInt(props.layers ?? '0', 10)
        }
        break
      }
      case 'DIGEST_ENTITY': {
        if (parts.length >= 6) {
          const props = parseKeyValueParts(parts.slice(3))
          result.entities.push({
            id: parts[1]?.trim() ?? '',
            correctedKind: parts[2]?.trim() ?? '',
            name: parts[3]?.trim() ?? '',
            importance: (props.importance as DigestEntity['importance']) ?? 'medium',
            summary: props.summary ?? ''
          })
        }
        break
      }
      case 'DIGEST_MISSING_EDGE': {
        if (parts.length >= 4) {
          const props = parseKeyValueParts(parts.slice(3))
          result.missingEdges.push({
            fromEntity: parts[1]?.trim() ?? '',
            toEntity: parts[2]?.trim() ?? '',
            reason: props.reason ?? parts[3]?.trim() ?? ''
          })
        }
        break
      }
      case 'DIGEST_CORRECTION': {
        if (parts.length >= 3) {
          const props = parseKeyValueParts(parts.slice(1))
          result.corrections.push({
            entityId: props.entityId ?? parts[1]?.trim() ?? '',
            field: props.field ?? '',
            oldValue: props.old ?? '',
            newValue: props.new ?? '',
            reason: props.reason ?? ''
          })
        }
        break
      }
      case 'DIGEST_PATTERN': {
        const props = parseKeyValueParts(parts.slice(1))
        result.patterns.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean),
          confidence: (props.confidence as DigestPattern['confidence']) ?? 'medium'
        })
        break
      }
      case 'DIGEST_BOUNDARY': {
        const props = parseKeyValueParts(parts.slice(1))
        result.boundaries.push({
          name: props.name ?? '',
          entities: (props.entities ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        })
        break
      }
      default:
        break
    }
  }

  return result
}

/** Parse key:value pairs from pipe-delimited segments */
function parseKeyValueParts(parts: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of parts) {
    const colonIdx = part.indexOf(':')
    if (colonIdx > 0) {
      const key = part.slice(0, colonIdx).trim()
      const value = part.slice(colonIdx + 1).trim()
      result[key] = value
    }
  }
  return result
}
