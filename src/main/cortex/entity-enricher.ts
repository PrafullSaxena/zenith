/**
 * entity-enricher.ts — Builds prompts for batched entity summary generation.
 * Entities already summarized by the digest are skipped.
 */
import type { GitService } from './git-service'

interface CodeEntity {
  id: string
  name: string
  kind: string
  filePath: string
  line: number
  endLine: number
  summary: string
}

const BATCH_SIZE = 50
const MAX_CONTEXT_LINES = 10

export interface EntityBatch {
  entities: CodeEntity[]
  systemPrompt: string
  userPrompt: string
}

/**
 * Build batches of unsummarized entities with their prompts.
 */
export async function buildEntityBatches(
  entities: CodeEntity[],
  existingSummaryIds: Set<string>,
  repoPath: string,
  git: GitService
): Promise<EntityBatch[]> {
  // Filter to entities without summaries
  const unsummarized = entities.filter(
    (e) => !e.summary && !existingSummaryIds.has(e.id)
  )

  if (unsummarized.length === 0) return []

  const systemPrompt = `You are a codebase analyst. For each entity below, generate a concise one-line summary describing what it does.

Output format — one record per line, pipe-delimited:
ENTITY_SUMMARY|<entityId>|summary:<one-line description>

Rules:
- Output ONLY ENTITY_SUMMARY records. No prose, no markdown.
- Every entity in the input MUST have a corresponding output line.
- Summaries should be 5-15 words, describing the entity's purpose.
- Use present tense ("Handles...", "Validates...", "Stores...").`

  const batches: EntityBatch[] = []

  for (let i = 0; i < unsummarized.length; i += BATCH_SIZE) {
    const batch = unsummarized.slice(i, i + BATCH_SIZE)
    const entityLines: string[] = []

    for (const entity of batch) {
      let contextSnippet = ''
      try {
        const content = await git.getFileContent(repoPath, entity.filePath)
        const lines = content.split('\n')
        const start = Math.max(0, entity.line - 1)
        const end = Math.min(lines.length, start + MAX_CONTEXT_LINES)
        contextSnippet = lines.slice(start, end).join('\n')
      } catch {
        // Skip source context if unreadable
      }

      entityLines.push(`ENTITY|${entity.id}|${entity.kind}|${entity.name}|${entity.filePath}`)
      if (contextSnippet) {
        entityLines.push('```')
        entityLines.push(contextSnippet)
        entityLines.push('```')
      }
    }

    batches.push({
      entities: batch,
      systemPrompt,
      userPrompt: `Generate summaries for these ${batch.length} entities:\n\n${entityLines.join('\n')}`
    })
  }

  return batches
}

/**
 * Parse entity summary TOON response.
 */
export function parseEntitySummaries(
  text: string
): Map<string, string> {
  const summaries = new Map<string, string>()

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('ENTITY_SUMMARY')) continue

    const parts = line.split('|')
    if (parts.length >= 3) {
      const entityId = parts[1]?.trim() ?? ''
      const summaryPart = parts.slice(2).join('|')
      const summaryMatch = summaryPart.match(/summary:(.+)/)
      const summary = summaryMatch ? summaryMatch[1].trim() : summaryPart.trim()
      if (entityId && summary) {
        summaries.set(entityId, summary)
      }
    }
  }

  return summaries
}
