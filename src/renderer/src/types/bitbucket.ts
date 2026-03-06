/** Pull request as returned to the renderer (subset of Bitbucket API response). */
export interface PullRequest {
  id: number
  title: string
  description: string
  state: string
  author: { display_name: string; uuid: string }
  source: { branch: { name: string } }
  destination: { branch: { name: string } }
  created_on: string
  updated_on: string
  links: { html: { href: string } }
}

/** Parsed diff file from parse-diff. */
export interface DiffFile {
  from: string
  to: string
  chunks: DiffChunk[]
  additions: number
  deletions: number
}

export interface DiffChunk {
  content: string
  changes: DiffChange[]
}

export interface DiffChange {
  type: 'add' | 'del' | 'normal'
  ln?: number
  ln1?: number
  ln2?: number
  content: string
}
