import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

export class AnalyzerDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'cortex', 'analyzer.db')
    // Ensure parent directory exists
    const dir = path.dirname(dbPath)
    fs.mkdirSync(dir, { recursive: true })
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.initSchema()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS analysis_cache (
        id TEXT PRIMARY KEY,
        repo_url TEXT NOT NULL,
        branch TEXT NOT NULL,
        commit_sha TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(repo_url, branch)
      );

      CREATE TABLE IF NOT EXISTS file_index (
        id INTEGER PRIMARY KEY,
        cache_id TEXT NOT NULL REFERENCES analysis_cache(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS file_index_fts USING fts5(
        file_path,
        content,
        content_rowid='id'
      );

      CREATE TABLE IF NOT EXISTS repos (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        name TEXT NOT NULL,
        branch TEXT NOT NULL,
        repoPath TEXT NOT NULL,
        repoType TEXT DEFAULT 'unknown',
        framework TEXT DEFAULT '',
        language TEXT DEFAULT '',
        commitSha TEXT DEFAULT '',
        lastAnalyzed TEXT,
        fileCount INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ai_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repoUrl TEXT NOT NULL,
        branch TEXT NOT NULL,
        commitSha TEXT NOT NULL,
        agentId TEXT NOT NULL,
        toonData TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        UNIQUE(repoUrl, branch, commitSha, agentId)
      );

      CREATE TABLE IF NOT EXISTS ai_enrichment (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repoUrl TEXT NOT NULL,
        branch TEXT NOT NULL,
        commitSha TEXT NOT NULL,
        enrichmentType TEXT NOT NULL,
        agentId TEXT NOT NULL,
        data TEXT NOT NULL,
        createdAt TEXT DEFAULT (datetime('now')),
        UNIQUE(repoUrl, branch, commitSha, enrichmentType, agentId)
      );
    `)
  }

  getAnalysis(
    repoUrl: string,
    branch: string,
    commitSha: string
  ): Record<string, unknown> | null {
    // If commitSha is empty, fetch the latest analysis for this repo+branch
    if (!commitSha) {
      return this.getLatestAnalysis(repoUrl, branch)
    }
    const row = this.db
      .prepare(
        'SELECT result_json FROM analysis_cache WHERE repo_url = ? AND branch = ? AND commit_sha = ?'
      )
      .get(repoUrl, branch, commitSha) as { result_json: string } | undefined
    if (!row) return null
    return JSON.parse(row.result_json)
  }

  /** Get the latest analysis for a repo+branch (ignoring commitSha) */
  getLatestAnalysis(repoUrl: string, branch: string): Record<string, unknown> | null {
    const row = this.db
      .prepare(
        'SELECT result_json FROM analysis_cache WHERE repo_url = ? AND branch = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(repoUrl, branch) as { result_json: string } | undefined
    if (!row) return null
    return JSON.parse(row.result_json)
  }

  saveAnalysis(
    repoUrl: string,
    branch: string,
    commitSha: string,
    result: Record<string, unknown>
  ): string {
    const id = `${repoUrl}:${branch}:${commitSha}`.replace(/[^a-zA-Z0-9:/_.-]/g, '_')

    // Delete existing entry for this repo+branch (UNIQUE constraint)
    this.db
      .prepare('DELETE FROM analysis_cache WHERE repo_url = ? AND branch = ?')
      .run(repoUrl, branch)

    this.db
      .prepare(
        'INSERT INTO analysis_cache (id, repo_url, branch, commit_sha, result_json) VALUES (?, ?, ?, ?, ?)'
      )
      .run(id, repoUrl, branch, commitSha, JSON.stringify(result))

    return id
  }

  deleteAnalysis(repoUrl: string, branch?: string): void {
    if (branch) {
      this.db
        .prepare('DELETE FROM analysis_cache WHERE repo_url = ? AND branch = ?')
        .run(repoUrl, branch)
    } else {
      this.db
        .prepare('DELETE FROM analysis_cache WHERE repo_url = ?')
        .run(repoUrl)
    }
  }

  listCachedRepos(): { repoUrl: string; branch: string; commitSha: string; createdAt: string }[] {
    const rows = this.db
      .prepare(
        'SELECT repo_url, branch, commit_sha, created_at FROM analysis_cache ORDER BY created_at DESC'
      )
      .all() as { repo_url: string; branch: string; commit_sha: string; created_at: string }[]
    return rows.map((r) => ({
      repoUrl: r.repo_url,
      branch: r.branch,
      commitSha: r.commit_sha,
      createdAt: r.created_at
    }))
  }

  // --- File indexing for FTS5 search (used by Plan 13-02 analyzer and Plan 13-05 Q&A) ---

  insertFileIndex(cacheId: string, filePath: string, content: string, language: string): void {
    const info = this.db
      .prepare(
        'INSERT INTO file_index (cache_id, file_path, content, language) VALUES (?, ?, ?, ?)'
      )
      .run(cacheId, filePath, content, language)

    // Sync FTS5 table
    this.db
      .prepare('INSERT INTO file_index_fts (rowid, file_path, content) VALUES (?, ?, ?)')
      .run(info.lastInsertRowid, filePath, content)
  }

  clearFileIndex(cacheId: string): void {
    // Get rowids to delete from FTS
    const rows = this.db
      .prepare('SELECT id FROM file_index WHERE cache_id = ?')
      .all(cacheId) as { id: number }[]

    for (const row of rows) {
      this.db
        .prepare('DELETE FROM file_index_fts WHERE rowid = ?')
        .run(row.id)
    }

    this.db.prepare('DELETE FROM file_index WHERE cache_id = ?').run(cacheId)
  }

  searchFiles(repoUrl: string, query: string): { filePath: string; snippet: string }[] {
    // Sanitize FTS5 query: remove special chars, wrap each word in double quotes
    const sanitized = query
      .replace(/['"(){}[\]*:^~!@#$%&]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `"${word}"`)
      .join(' ')

    if (!sanitized) return []

    const rows = this.db
      .prepare(
        `
      SELECT fi.file_path, snippet(file_index_fts, 1, '<mark>', '</mark>', '...', 64) AS snippet
      FROM file_index_fts
      JOIN file_index fi ON fi.id = file_index_fts.rowid
      JOIN analysis_cache ac ON ac.id = fi.cache_id
      WHERE ac.repo_url = ? AND file_index_fts MATCH ?
      LIMIT 20
    `
      )
      .all(repoUrl, sanitized) as { file_path: string; snippet: string }[]
    return rows.map((r) => ({ filePath: r.file_path, snippet: r.snippet }))
  }

  // --- Repo persistence ---

  saveRepo(repo: {
    id: string
    url: string
    name: string
    branch: string
    repoPath: string
    repoType?: string
    framework?: string
    language?: string
    commitSha?: string
    lastAnalyzed?: string | null
    fileCount?: number
  }): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO repos (id, url, name, branch, repoPath, repoType, framework, language, commitSha, lastAnalyzed, fileCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        repo.id,
        repo.url,
        repo.name,
        repo.branch,
        repo.repoPath,
        repo.repoType ?? 'unknown',
        repo.framework ?? '',
        repo.language ?? '',
        repo.commitSha ?? '',
        repo.lastAnalyzed ?? null,
        repo.fileCount ?? 0
      )
  }

  listRepos(): Array<{
    id: string
    url: string
    name: string
    branch: string
    repoPath: string
    repoType: string
    framework: string
    language: string
    commitSha: string
    lastAnalyzed: string | null
    fileCount: number
  }> {
    return this.db.prepare('SELECT * FROM repos').all() as Array<{
      id: string
      url: string
      name: string
      branch: string
      repoPath: string
      repoType: string
      framework: string
      language: string
      commitSha: string
      lastAnalyzed: string | null
      fileCount: number
    }>
  }

  removeRepo(id: string): void {
    this.db.prepare('DELETE FROM repos WHERE id = ?').run(id)
  }

  updateRepo(id: string, fields: Record<string, unknown>): void {
    const allowed = [
      'url',
      'name',
      'branch',
      'repoPath',
      'repoType',
      'framework',
      'language',
      'commitSha',
      'lastAnalyzed',
      'fileCount'
    ]
    const entries = Object.entries(fields).filter(([k]) => allowed.includes(k))
    if (entries.length === 0) return

    const setClauses = entries.map(([k]) => `${k} = ?`).join(', ')
    const values = entries.map(([, v]) => v)
    this.db.prepare(`UPDATE repos SET ${setClauses} WHERE id = ?`).run(...values, id)
  }

  getRepoById(
    id: string
  ): {
    id: string
    url: string
    name: string
    branch: string
    repoPath: string
    repoType: string
    framework: string
    language: string
    commitSha: string
    lastAnalyzed: string | null
    fileCount: number
  } | null {
    return (
      (this.db.prepare('SELECT * FROM repos WHERE id = ?').get(id) as {
        id: string
        url: string
        name: string
        branch: string
        repoPath: string
        repoType: string
        framework: string
        language: string
        commitSha: string
        lastAnalyzed: string | null
        fileCount: number
      } | undefined) ?? null
    )
  }

  // --- AI Insights ---

  saveInsights(
    repoUrl: string,
    branch: string,
    commitSha: string,
    agentId: string,
    toonData: string
  ): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ai_insights (repoUrl, branch, commitSha, agentId, toonData, createdAt)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(repoUrl, branch, commitSha, agentId, toonData)
  }

  getInsights(repoUrl: string, branch: string, commitSha: string): string | null {
    const row = this.db
      .prepare(
        'SELECT toonData FROM ai_insights WHERE repoUrl = ? AND branch = ? AND commitSha = ? ORDER BY createdAt DESC LIMIT 1'
      )
      .get(repoUrl, branch, commitSha) as { toonData: string } | undefined
    return row?.toonData ?? null
  }

  clearInsights(repoUrl: string, branch: string): void {
    this.db
      .prepare('DELETE FROM ai_insights WHERE repoUrl = ? AND branch = ?')
      .run(repoUrl, branch)
  }

  // --- AI Enrichment ---

  saveEnrichment(
    repoUrl: string,
    branch: string,
    commitSha: string,
    enrichmentType: string,
    agentId: string,
    data: string
  ): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO ai_enrichment (repoUrl, branch, commitSha, enrichmentType, agentId, data, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(repoUrl, branch, commitSha, enrichmentType, agentId, data)
  }

  getEnrichment(
    repoUrl: string,
    branch: string,
    commitSha: string,
    enrichmentType: string
  ): string | null {
    const row = this.db
      .prepare(
        'SELECT data FROM ai_enrichment WHERE repoUrl = ? AND branch = ? AND commitSha = ? AND enrichmentType = ? ORDER BY createdAt DESC LIMIT 1'
      )
      .get(repoUrl, branch, commitSha, enrichmentType) as { data: string } | undefined
    return row?.data ?? null
  }

  clearEnrichments(repoUrl: string, branch: string): void {
    this.db
      .prepare('DELETE FROM ai_enrichment WHERE repoUrl = ? AND branch = ?')
      .run(repoUrl, branch)
  }

  clearEnrichmentByType(
    repoUrl: string,
    branch: string,
    commitSha: string,
    enrichmentType: string
  ): void {
    this.db
      .prepare(
        'DELETE FROM ai_enrichment WHERE repoUrl = ? AND branch = ? AND commitSha = ? AND enrichmentType = ?'
      )
      .run(repoUrl, branch, commitSha, enrichmentType)
  }

  close(): void {
    this.db.close()
  }
}
