import simpleGit, { SimpleGit } from 'simple-git'
import { app } from 'electron'
import path from 'path'
import fs from 'fs/promises'

export class GitService {
  private baseDir: string

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'cortex', 'repos')
  }

  async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true })
  }

  getRepoPath(repoName: string): string {
    return path.join(this.baseDir, repoName)
  }

  async clone(
    url: string,
    name: string,
    onProgress?: (data: { stage: string; progress: number; detail: string }) => void
  ): Promise<{ repoPath: string }> {
    await this.ensureBaseDir()
    const repoPath = this.getRepoPath(name)

    // Remove existing directory if present (re-clone)
    try {
      await fs.rm(repoPath, { recursive: true, force: true })
    } catch {
      // Ignore if doesn't exist
    }

    const git: SimpleGit = simpleGit({
      baseDir: this.baseDir
    })

    // Prevent git from hanging on auth prompts
    const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' }

    // Parse progress from stderr output
    git.outputHandler((_command, stdout, stderr) => {
      stderr.on('data', (data: Buffer) => {
        const line = data.toString()
        if (!onProgress) return

        if (line.includes('Counting')) {
          const match = line.match(/(\d+)/)
          onProgress({
            stage: 'counting',
            progress: 10,
            detail: match ? `Counting objects: ${match[1]}` : 'Counting objects...'
          })
        } else if (line.includes('Compressing')) {
          const match = line.match(/(\d+)%/)
          onProgress({
            stage: 'compressing',
            progress: match ? 10 + Math.round(parseInt(match[1]) * 0.2) : 20,
            detail: match ? `Compressing: ${match[1]}%` : 'Compressing...'
          })
        } else if (line.includes('Receiving')) {
          const match = line.match(/(\d+)%/)
          onProgress({
            stage: 'receiving',
            progress: match ? 30 + Math.round(parseInt(match[1]) * 0.5) : 50,
            detail: match ? `Receiving: ${match[1]}%` : 'Receiving objects...'
          })
        } else if (line.includes('Resolving')) {
          const match = line.match(/(\d+)%/)
          onProgress({
            stage: 'resolving',
            progress: match ? 80 + Math.round(parseInt(match[1]) * 0.15) : 90,
            detail: match ? `Resolving: ${match[1]}%` : 'Resolving deltas...'
          })
        }
      })

      // Consume stdout to prevent backpressure
      stdout.on('data', () => {})
    })

    await git.env(gitEnv).clone(url, name, ['--depth', '100', '--single-branch'])

    onProgress?.({ stage: 'done', progress: 100, detail: 'Clone complete' })

    return { repoPath }
  }

  async getBranches(repoPath: string): Promise<{ name: string; current: boolean }[]> {
    const git = this.createGit(repoPath)
    const summary = await git.branchLocal()
    return summary.all.map((name) => ({
      name,
      current: name === summary.current
    }))
  }

  async checkout(repoPath: string, branch: string): Promise<void> {
    const git = this.createGit(repoPath)
    await git.checkout(branch)
  }

  async getCurrentCommit(repoPath: string): Promise<string> {
    const git = this.createGit(repoPath)
    return git.revparse(['HEAD'])
  }

  async getFileTree(repoPath: string): Promise<string[]> {
    const git = this.createGit(repoPath)
    const result = await git.raw(['ls-tree', '-r', '--name-only', 'HEAD'])
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
  }

  async getFileContent(repoPath: string, filePath: string): Promise<string> {
    // Path traversal validation: resolved path must start with repoPath
    const resolved = path.resolve(repoPath, filePath)
    const normalizedRepo = path.resolve(repoPath)
    if (!resolved.startsWith(normalizedRepo + path.sep) && resolved !== normalizedRepo) {
      throw new Error('Path traversal detected')
    }

    return fs.readFile(resolved, 'utf-8')
  }

  async fetchAndReset(repoPath: string, branch: string): Promise<string> {
    const git = this.createGit(repoPath)
    await git.fetch('origin')
    await git.reset(['--hard', `origin/${branch}`])
    const log = await git.log({ maxCount: 1 })
    return log.latest?.hash ?? ''
  }

  async removeRepo(repoPath: string): Promise<void> {
    await fs.rm(repoPath, { recursive: true, force: true })
  }

  async fetchRemoteBranches(url: string): Promise<string[]> {
    const git = simpleGit()
    const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    const result = await git.env(gitEnv).listRemote(['--heads', url])
    return result
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => {
        // Format: <sha>\trefs/heads/<branch>
        const match = line.match(/refs\/heads\/(.+)$/)
        return match ? match[1] : ''
      })
      .filter((name) => name.length > 0)
  }

  private createGit(repoPath: string): SimpleGit {
    return simpleGit({
      baseDir: repoPath
    }).env({ ...process.env, GIT_TERMINAL_PROMPT: '0' })
  }
}
