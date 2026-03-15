import { GitService } from './git-service'
import { detectRepoType } from './repo-detector'
import { AnalyzerDatabase } from './cache-db'
import { parseRepository, type ParseResult } from './parser/index'
import type { TestStats } from './test-detector'
import path from 'path'
import fs from 'fs/promises'

/** Shape matching renderer AnalysisResult — duplicated to avoid cross-process type import */
interface AnalysisResult {
  repoId: string
  repoType: string
  framework: string
  language: string
  commitSha: string
  entities: unknown[]
  calls: unknown[]
  routes: unknown[]
  components: unknown[]
  pipelines: unknown[]
  fileTree: FileNode[]
  stats: {
    totalFiles: number
    totalLines: number
    languages: { language: string; fileCount: number; lineCount: number }[]
    entityCount: { kind: string; count: number }[]
    routeCount: number
    componentCount: number
    pipelineCount: number
  }
  testStats: TestStats
  documentation: string
  markdownFiles: { name: string; path: string; content: string }[]
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  language: string | null
  children: FileNode[]
  size: number
}

/**
 * Parser version — increment whenever parser logic changes to
 * automatically invalidate stale cached analysis results.
 */
export const PARSER_VERSION = 3

/** Maximum number of files to index for FTS5 search */
const MAX_INDEX_FILES = 5000

export class CodebaseAnalyzer {
  public git: GitService
  public cache: AnalyzerDatabase

  constructor() {
    this.git = new GitService()
    this.cache = new AnalyzerDatabase()
  }

  async analyzeRepository(
    repoPath: string,
    branch: string,
    repoUrl: string,
    onProgress?: (data: {
      phase: string
      progress: number
      detail: string
      filesProcessed: number
      totalFiles: number
    }) => void
  ): Promise<AnalysisResult> {
    // 1. Get current commit SHA
    const commitSha = await this.git.getCurrentCommit(repoPath)

    // 2. Check cache — return if valid
    onProgress?.({
      phase: 'scanning',
      progress: 0,
      detail: 'Checking cache...',
      filesProcessed: 0,
      totalFiles: 0
    })
    const cached = this.cache.getAnalysis(repoUrl, branch, commitSha)
    if (cached) {
      // Invalidate cache if parser version has changed
      const cachedVersion = (cached as Record<string, unknown>)._parserVersion as number | undefined
      if (cachedVersion === PARSER_VERSION) {
        onProgress?.({
          phase: 'done',
          progress: 100,
          detail: 'Loaded from cache',
          filesProcessed: 0,
          totalFiles: 0
        })
        return cached as unknown as AnalysisResult
      }
      // Stale cache — delete and re-analyze
      this.cache.deleteAnalysis(repoUrl, branch)
    }

    // 3. Get file tree
    onProgress?.({
      phase: 'scanning',
      progress: 10,
      detail: 'Scanning files...',
      filesProcessed: 0,
      totalFiles: 0
    })
    const filePaths = await this.git.getFileTree(repoPath)
    const totalFiles = filePaths.length

    // 4. Detect repo type
    onProgress?.({
      phase: 'scanning',
      progress: 20,
      detail: 'Detecting repository type...',
      filesProcessed: 0,
      totalFiles
    })
    const classification = await detectRepoType(repoPath, filePaths)
    onProgress?.({
      phase: 'scanning',
      progress: 20,
      detail: `Detected: ${classification.framework} (${classification.type})`,
      filesProcessed: 0,
      totalFiles
    })

    // 5. Parse source files
    onProgress?.({
      phase: 'parsing',
      progress: 25,
      detail: 'Parsing source files...',
      filesProcessed: 0,
      totalFiles
    })
    const parseResult: ParseResult = await parseRepository(
      repoPath,
      classification.type,
      classification.framework,
      classification.language,
      filePaths,
      (processed, total) => {
        const pct = 25 + Math.round((processed / total) * 50)
        onProgress?.({
          phase: 'parsing',
          progress: pct,
          detail: `Parsed ${processed}/${total} files`,
          filesProcessed: processed,
          totalFiles: total
        })
      }
    )

    // 6. Build file tree
    onProgress?.({
      phase: 'indexing',
      progress: 80,
      detail: 'Building file tree...',
      filesProcessed: totalFiles,
      totalFiles
    })
    const fileTree = await this.buildFileTreeWithSize(repoPath, filePaths)

    // 7. Compute stats
    const stats = await this.computeStats(repoPath, parseResult, filePaths)

    // 8. Scan for markdown files in repo root
    const markdownFiles = await this.scanMarkdownFiles(repoPath, filePaths)

    // 9. Generate static documentation from analysis data
    const documentation = this.generateDocumentation(
      classification, parseResult, stats, markdownFiles
    )

    // 10. Assemble result
    const result: AnalysisResult = {
      repoId: '', // set by caller
      repoType: classification.type,
      framework: classification.framework,
      language: classification.language,
      commitSha,
      entities: parseResult.entities,
      calls: parseResult.calls,
      routes: parseResult.routes,
      components: parseResult.components,
      pipelines: parseResult.pipelines,
      fileTree,
      stats,
      testStats: parseResult.testStats,
      documentation,
      markdownFiles
    }

    // 9. Cache results
    onProgress?.({
      phase: 'indexing',
      progress: 90,
      detail: 'Caching results...',
      filesProcessed: totalFiles,
      totalFiles
    })
    const cachePayload = { ...result, _parserVersion: PARSER_VERSION } as unknown as Record<string, unknown>
    const cacheId = this.cache.saveAnalysis(
      repoUrl,
      branch,
      commitSha,
      cachePayload
    )

    // 10. Index files for FTS search
    await this.indexFilesForSearch(repoPath, cacheId, filePaths)

    onProgress?.({
      phase: 'done',
      progress: 100,
      detail: 'Analysis complete',
      filesProcessed: totalFiles,
      totalFiles
    })

    return result
  }

  /** Compute analysis statistics from parse results and file list */
  private async computeStats(
    repoPath: string,
    parseResult: ParseResult,
    filePaths: string[]
  ): Promise<AnalysisResult['stats']> {
    // Count files by language and total lines
    const langMap = new Map<string, { fileCount: number; lineCount: number }>()
    let totalLines = 0

    for (const fp of filePaths) {
      const lang = this.detectLanguage(fp)
      if (lang !== 'binary') {
        try {
          const content = await this.git.getFileContent(repoPath, fp)
          const lines = content.split('\n').length
          totalLines += lines
          const entry = langMap.get(lang) || { fileCount: 0, lineCount: 0 }
          entry.fileCount++
          entry.lineCount += lines
          langMap.set(lang, entry)
        } catch {
          // Skip unreadable files
        }
      }
    }

    const languages = Array.from(langMap.entries())
      .map(([language, stats]) => ({ language, ...stats }))
      .sort((a, b) => b.lineCount - a.lineCount)

    // Count entities by kind
    const kindMap = new Map<string, number>()
    for (const entity of parseResult.entities) {
      const count = kindMap.get(entity.kind) || 0
      kindMap.set(entity.kind, count + 1)
    }
    const entityCount = Array.from(kindMap.entries())
      .map(([kind, count]) => ({ kind, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalFiles: filePaths.length,
      totalLines,
      languages,
      entityCount,
      routeCount: parseResult.routes.length,
      componentCount: parseResult.components.length,
      pipelineCount: parseResult.pipelines.length
    }
  }

  /** Index source files into FTS5 tables for code search.
   *  Limits to source files only (not binary, not node_modules).
   *  Caps at MAX_INDEX_FILES to avoid excessive indexing time.
   */
  private async indexFilesForSearch(
    repoPath: string,
    cacheId: string,
    filePaths: string[]
  ): Promise<void> {
    this.cache.clearFileIndex(cacheId)

    // Filter to source files only
    const sourceFiles = filePaths.filter((fp) => {
      if (fp.includes('node_modules/')) return false
      if (fp.includes('.git/')) return false
      const lang = this.detectLanguage(fp)
      return lang !== 'binary' && lang !== 'plaintext'
    })

    // Cap at MAX_INDEX_FILES
    const filesToIndex = sourceFiles.slice(0, MAX_INDEX_FILES)

    for (const fp of filesToIndex) {
      try {
        const content = await this.git.getFileContent(repoPath, fp)
        const lang = this.detectLanguage(fp)
        this.cache.insertFileIndex(cacheId, fp, content, lang)
      } catch {
        // Skip unreadable files
      }
    }
  }

  /** Build a FileNode[] tree from a flat list of file paths */
  buildFileTree(filePaths: string[]): FileNode[] {
    const root: FileNode[] = []

    for (const fp of filePaths) {
      const parts = fp.split('/')
      let currentLevel = root

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        const isFile = i === parts.length - 1
        const currentPath = parts.slice(0, i + 1).join('/')

        let existing = currentLevel.find((n) => n.name === part)

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            language: isFile ? this.detectLanguage(fp) : null,
            children: [],
            size: 0
          }
          currentLevel.push(existing)
        }

        if (!isFile) {
          currentLevel = existing.children
        }
      }
    }

    // Sort: directories first, then files, alphabetically
    const sortNodes = (nodes: FileNode[]): void => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      for (const node of nodes) {
        if (node.children.length > 0) sortNodes(node.children)
      }
    }

    sortNodes(root)
    return root
  }

  /** Build file tree with actual file sizes from disk */
  private async buildFileTreeWithSize(
    repoPath: string,
    filePaths: string[]
  ): Promise<FileNode[]> {
    const tree = this.buildFileTree(filePaths)

    // Populate file sizes
    const populateSizes = async (nodes: FileNode[]): Promise<void> => {
      for (const node of nodes) {
        if (node.type === 'file') {
          try {
            const stat = await fs.stat(path.join(repoPath, node.path))
            node.size = stat.size
          } catch {
            node.size = 0
          }
        } else {
          await populateSizes(node.children)
          // Directory size = sum of children
          node.size = node.children.reduce((sum, child) => sum + child.size, 0)
        }
      }
    }

    await populateSizes(tree)
    return tree
  }

  /** Detect language from file extension */
  detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const map: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.mjs': 'javascript',
      '.cjs': 'javascript',
      '.java': 'java',
      '.py': 'python',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.kts': 'kotlin',
      '.scala': 'scala',
      '.sql': 'sql',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.html': 'html',
      '.htm': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.md': 'markdown',
      '.mdx': 'markdown',
      '.sh': 'shell',
      '.bash': 'shell',
      '.zsh': 'shell',
      '.toml': 'toml',
      '.ini': 'ini',
      '.cfg': 'ini',
      '.env': 'plaintext',
      '.txt': 'plaintext',
      '.dockerfile': 'dockerfile',
      '.graphql': 'graphql',
      '.gql': 'graphql',
      '.proto': 'protobuf',
      '.r': 'r',
      '.lua': 'lua',
      '.dart': 'dart',
      '.vue': 'vue',
      '.svelte': 'svelte',
      // Binary / non-text
      '.png': 'binary',
      '.jpg': 'binary',
      '.jpeg': 'binary',
      '.gif': 'binary',
      '.svg': 'xml',
      '.ico': 'binary',
      '.woff': 'binary',
      '.woff2': 'binary',
      '.ttf': 'binary',
      '.eot': 'binary',
      '.zip': 'binary',
      '.tar': 'binary',
      '.gz': 'binary',
      '.jar': 'binary',
      '.war': 'binary',
      '.class': 'binary',
      '.pyc': 'binary',
      '.pyo': 'binary',
      '.so': 'binary',
      '.dll': 'binary',
      '.exe': 'binary',
      '.pdf': 'binary',
      '.lock': 'plaintext'
    }

    // Handle Dockerfile (no extension)
    const basename = path.basename(filePath).toLowerCase()
    if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return 'dockerfile'
    if (basename === 'makefile') return 'makefile'
    if (basename === '.gitignore' || basename === '.dockerignore') return 'plaintext'

    return map[ext] || 'plaintext'
  }

  /** Scan for markdown files in repo root and first-level directories */
  private async scanMarkdownFiles(
    repoPath: string,
    filePaths: string[]
  ): Promise<{ name: string; path: string; content: string }[]> {
    const mdFiles: { name: string; path: string; content: string }[] = []
    const mdPaths = filePaths.filter((fp) => {
      if (!fp.toLowerCase().endsWith('.md')) return false
      // Only root-level or docs/ directory markdown files
      const depth = fp.split('/').length
      return depth <= 2
    })

    for (const fp of mdPaths.slice(0, 10)) {
      try {
        const content = await fs.readFile(path.join(repoPath, fp), 'utf-8')
        mdFiles.push({
          name: path.basename(fp),
          path: fp,
          content: content.slice(0, 50000) // cap at 50KB
        })
      } catch {
        // Skip unreadable files
      }
    }

    return mdFiles
  }

  /** Generate documentation summary from static analysis data */
  private generateDocumentation(
    classification: { type: string; framework: string; language: string },
    parseResult: ParseResult,
    stats: AnalysisResult['stats'],
    markdownFiles: { name: string; path: string; content: string }[]
  ): string {
    const lines: string[] = []

    lines.push(`## Project Overview`)
    lines.push('')
    lines.push(`- **Type:** ${classification.type}`)
    lines.push(`- **Framework:** ${classification.framework}`)
    lines.push(`- **Primary Language:** ${classification.language}`)
    lines.push(`- **Total Files:** ${stats.totalFiles.toLocaleString()}`)
    lines.push(`- **Total Lines:** ${stats.totalLines.toLocaleString()}`)
    lines.push('')

    // Entity summary
    if (stats.entityCount.length > 0) {
      lines.push(`## Code Structure`)
      lines.push('')
      for (const { kind, count } of stats.entityCount) {
        lines.push(`- **${kind}s:** ${count}`)
      }
      lines.push('')
    }

    // API endpoints summary
    if (parseResult.routes.length > 0) {
      lines.push(`## API Endpoints (${parseResult.routes.length} total)`)
      lines.push('')
      // Group by controller
      const byController = new Map<string, typeof parseResult.routes>()
      for (const route of parseResult.routes) {
        const ctrl = route.controllerName || 'General'
        const list = byController.get(ctrl) ?? []
        list.push(route)
        byController.set(ctrl, list)
      }
      for (const [ctrl, routes] of byController) {
        lines.push(`### ${ctrl}`)
        for (const r of routes.slice(0, 20)) {
          lines.push(`- \`${r.method} ${r.fullPath}\` → ${r.handlerName}`)
        }
        if (routes.length > 20) {
          lines.push(`- ... and ${routes.length - 20} more`)
        }
        lines.push('')
      }
    }

    // Component summary
    if (parseResult.components.length > 0) {
      lines.push(`## Components (${parseResult.components.length} total)`)
      lines.push('')
      const routeComps = parseResult.components.filter((c) => c.isRoute)
      if (routeComps.length > 0) {
        lines.push(`### Route Components`)
        for (const c of routeComps.slice(0, 15)) {
          lines.push(`- **${c.name}** → \`${c.routePath}\``)
        }
        lines.push('')
      }
    }

    // Pipeline summary
    if (parseResult.pipelines.length > 0) {
      lines.push(`## Pipelines (${parseResult.pipelines.length} total)`)
      lines.push('')
      for (const p of parseResult.pipelines.slice(0, 10)) {
        lines.push(`- **${p.name}** (${p.type}) — ${p.tasks.length} tasks${p.schedule ? `, schedule: ${p.schedule}` : ''}`)
      }
      lines.push('')
    }

    // Language breakdown
    if (stats.languages.length > 0) {
      const topLangs = stats.languages.slice(0, 5)
      lines.push(`## Language Distribution`)
      lines.push('')
      for (const lang of topLangs) {
        const pct = stats.totalLines > 0 ? ((lang.lineCount / stats.totalLines) * 100).toFixed(1) : '0'
        lines.push(`- **${lang.language}:** ${lang.fileCount} files (${pct}%)`)
      }
      lines.push('')
    }

    // README excerpt
    const readme = markdownFiles.find((f) => f.name.toLowerCase() === 'readme.md')
    if (readme) {
      const excerpt = readme.content.slice(0, 1000)
      const truncated = excerpt.length < readme.content.length
      lines.push(`## From README`)
      lines.push('')
      lines.push(excerpt)
      if (truncated) lines.push('\n*... (truncated)*')
      lines.push('')
    }

    return lines.join('\n')
  }

  close(): void {
    this.cache.close()
  }
}
