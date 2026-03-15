/**
 * analysis-validator.ts — Builds prompts for AI analysis validation.
 * AI reviews routes, call edges, and entity kinds for corrections.
 */

export function buildValidationPrompt(): string {
  return `You are a codebase analyst reviewing the output of a static code parser. The parser uses regex/AST and sometimes misses or misclassifies things. Review the data below and identify issues.

Output format — one record per line, pipe-delimited:
MISSING_ROUTE|<method>|<path>|<handlerEntity>|reason:<explanation>
MISSING_EDGE|<fromEntityId>|<toEntityId>|type:<call|event|inject>|reason:<explanation>
KIND_CORRECTION|<entityId>|old:<currentKind>|new:<correctKind>|reason:<explanation>
ROUTE_CORRECTION|<routeIndex>|field:<fieldName>|old:<currentValue>|new:<correctValue>|reason:<explanation>
DEAD_ROUTE|<routeIndex>|reason:<explanation>

Rules:
- Output ONLY the record types above. No prose, no markdown.
- Only report issues you are confident about based on the source code shown.
- routeIndex is the 0-based index in the routes array provided.
- For MISSING_EDGE, the type should be 'event' for event-driven, 'inject' for DI, 'call' for direct calls.
- Be conservative — false positives waste the developer's time.`
}

export function buildValidationUserPrompt(
  digestText: string,
  routes: string,
  edges: string
): string {
  return `Review this codebase analysis for errors and missing data:

## Digest (entity source + metadata)
${digestText}

## Current Routes
${routes}

## Current Call Edges
${edges}

Identify any issues (missing routes, missing edges, wrong entity kinds, wrong route paths, dead routes).`
}
