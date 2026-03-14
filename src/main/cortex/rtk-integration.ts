import { execSync, execFileSync } from 'child_process'

let rtkAvailable: boolean | null = null
let rtkFailCount = 0
const MAX_FAILURES = 3

export function isRtkAvailable(): boolean {
  if (rtkAvailable !== null) return rtkAvailable && rtkFailCount < MAX_FAILURES
  try {
    execSync('rtk --version', { encoding: 'utf-8', timeout: 5000 })
    rtkAvailable = true
  } catch {
    rtkAvailable = false
  }
  return rtkAvailable
}

export function compressFileContent(filePath: string): string | null {
  if (!isRtkAvailable()) return null
  try {
    return execFileSync('rtk', ['read', filePath], { encoding: 'utf-8', timeout: 10000 })
  } catch {
    rtkFailCount++
    return null // caller falls back to raw read
  }
}

export function compressGitLog(repoPath: string, count: number = 20): string | null {
  if (!isRtkAvailable()) return null
  try {
    return execFileSync('rtk', ['git', 'log', `--oneline`, `-${count}`], {
      encoding: 'utf-8',
      cwd: repoPath,
      timeout: 10000
    })
  } catch {
    rtkFailCount++
    return null
  }
}
